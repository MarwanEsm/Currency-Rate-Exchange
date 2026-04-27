import { ADMIN_PERMISSION, hasAdminPermission, normalizeAdminRoles } from "@/domain/adminPermissions";
import {
    ADMIN_DECISION,
    ADMIN_DECISION_ERROR_CODES,
    applyAdminDecisionToPaidOrder,
} from "@/domain/fiatToCryptoAdminQueue";
import {
    buildOrderPricingPatch,
    computeFiatToCryptoQuote,
    DEFAULT_COMMISSION_CONFIG,
    validateCommissionConfig,
} from "@/domain/fiatToCryptoPricing";
import { getFiatToCryptoOrderById, updateFiatToCryptoOrder } from "@/server/inMemoryFiatToCryptoOrders";

const ERROR_STATUS = {
    [ADMIN_DECISION_ERROR_CODES.PERMISSION_DENIED]: 403,
    [ADMIN_DECISION_ERROR_CODES.INVALID_DECISION]: 400,
    [ADMIN_DECISION_ERROR_CODES.REASON_REQUIRED]: 400,
    [ADMIN_DECISION_ERROR_CODES.ORDER_NOT_FOUND]: 404,
    [ADMIN_DECISION_ERROR_CODES.ORDER_NOT_PENDING_APPROVAL]: 409,
    [ADMIN_DECISION_ERROR_CODES.COMPLIANCE_BLOCKED]: 409,
};

/**
 * POST /api/fiat-to-crypto/admin/orders/[id]/decision — approve or reject a `paid` order (FCX-26).
 *
 * Body: { decision: 'approve' | 'reject', reason: string, complianceContext?: {...}, exchangeRate?, commissionConfig? }
 * `approve` requires `exchangeRate` (FCX-42 lock-in); `commissionConfig` is optional.
 * Optional `complianceContext` only fills gaps when the order has no stored AML/sanctions snapshot; order fields win (FCX-39).
 * Demo auth: `x-admin-user-id` and `x-admin-roles` headers. See queue.js for production notes.
 */
export default function handler(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Method not allowed" });
    }

    const adminUserId = typeof req.headers["x-admin-user-id"] === "string" ? req.headers["x-admin-user-id"].trim() : "";
    const rawRoles = typeof req.headers["x-admin-roles"] === "string" ? req.headers["x-admin-roles"] : "";
    const roles = normalizeAdminRoles(
        rawRoles
            .split(",")
            .map((r) => r.trim())
            .filter(Boolean),
    );

    if (!adminUserId || !hasAdminPermission(roles, ADMIN_PERMISSION.DECIDE_ORDER_APPROVAL)) {
        return res.status(403).json({ error: "forbidden" });
    }

    const id = typeof req.query?.id === "string" ? req.query.id : Array.isArray(req.query?.id) ? req.query.id[0] : "";
    if (!id) {
        return res.status(400).json({ error: "order id is required" });
    }

    const body = req.body;
    if (!body || typeof body !== "object") {
        return res.status(400).json({ error: "JSON body is required" });
    }

    const order = getFiatToCryptoOrderById(id);

    /** FCX-42: every approval locks in gross/fee/net + net crypto before we record an audit or persist. */
    /** @type {import("@/domain/fiatToCryptoPricing").FiatToCryptoQuote | null} */
    let approveQuote = null;
    if (body.decision === ADMIN_DECISION.APPROVE) {
        if (!order) {
            return res.status(404).json({ error: ADMIN_DECISION_ERROR_CODES.ORDER_NOT_FOUND });
        }
        const exchangeRate = typeof body.exchangeRate === "string" ? body.exchangeRate.trim() : "";
        if (!exchangeRate) {
            return res.status(400).json({
                error: "exchange_rate_required",
                message: "exchangeRate is required when approving (positive decimal string).",
            });
        }
        const config = body.commissionConfig ?? DEFAULT_COMMISSION_CONFIG;
        const configErrors = validateCommissionConfig(config);
        if (configErrors.length > 0) {
            return res.status(400).json({ error: "invalid_commission_config", messages: configErrors });
        }
        try {
            approveQuote = computeFiatToCryptoQuote({
                fiatAmount: order.fiatAmount,
                fiatCurrency: order.fiatCurrency,
                targetAssetCode: order.targetAssetCode,
                exchangeRate,
                commissionConfig: config,
            });
        } catch (e) {
            return res.status(400).json({ error: "pricing_failed", message: String(e?.message ?? e) });
        }
    }

    const result = applyAdminDecisionToPaidOrder({
        order,
        decision: body.decision,
        reason: typeof body.reason === "string" ? body.reason : "",
        adminUserId,
        adminRoles: roles,
        complianceContext:
            body.complianceContext && typeof body.complianceContext === "object" ? body.complianceContext : undefined,
    });

    if (!result.ok) {
        const status = ERROR_STATUS[result.errorCode] ?? 400;
        return res.status(status).json({
            error: result.errorCode,
            message: result.errorMessage,
            ...(result.complianceReasonCodes ? { complianceReasonCodes: result.complianceReasonCodes } : {}),
        });
    }

    /** @type {Record<string, unknown>} */
    let orderPatch = { ...result.orderPatch };

    if (body.decision === ADMIN_DECISION.APPROVE && approveQuote) {
        orderPatch = { ...orderPatch, ...buildOrderPricingPatch(approveQuote) };
    }

    const updated = updateFiatToCryptoOrder(id, orderPatch);
    if (!updated) {
        return res.status(404).json({ error: ADMIN_DECISION_ERROR_CODES.ORDER_NOT_FOUND });
    }

    return res.status(200).json({
        order: updated,
        audit: result.audit,
        decision: body.decision === ADMIN_DECISION.REJECT ? "reject" : "approve",
    });
}
