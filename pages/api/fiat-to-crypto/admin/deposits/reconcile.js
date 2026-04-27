import { randomUUID } from "crypto";
import { ADMIN_PERMISSION, hasAdminPermission, normalizeAdminRoles } from "@/domain/adminPermissions";
import { FIAT_TO_CRYPTO_ORDER_STATUS } from "@/domain/fiatToCryptoOrder";
import {
    DEFAULT_DEPOSIT_AMOUNT_TOLERANCE_BPS,
    findOrderForDeposit,
    reconcileDeposit,
    validateDepositRecord,
} from "@/domain/fiatToCryptoDeposit";
import {
    getFiatToCryptoOrderById,
    listFiatToCryptoOrdersByStatus,
    updateFiatToCryptoOrder,
} from "@/server/inMemoryFiatToCryptoOrders";
import {
    listReconciledDepositIds,
    saveReconciledDeposit,
} from "@/server/inMemoryFiatToCryptoDeposits";

/**
 * POST /api/fiat-to-crypto/admin/deposits/reconcile — match & verify an incoming fiat deposit
 * against a pending order (FCX-23, FCX-41).
 *
 * Body: {
 *   deposit: DepositRecord,
 *   orderId?: string,        // optional explicit order id; otherwise resolved from deposit.reference
 *   notes?: string,
 *   toleranceBps?: number,  // override tolerance for amount comparison
 *   complianceScreening?: { amlCheckStatus: string, sanctionsCheckStatus: string }  // FCX-39 — required for a safe path to purchasing after match
 * }
 *
 * Response: { ok, outcome, event, order? } — HTTP 200 for `matched`, 409 for all non-matched
 * outcomes that still represent a recorded event (under/over/currency/no-match/ineligible/dup).
 * 400 for validation failures.
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

    if (!adminUserId || !hasAdminPermission(roles, ADMIN_PERMISSION.RECONCILE_DEPOSIT)) {
        return res.status(403).json({ error: "forbidden" });
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const deposit = body.deposit;
    const depositErrors = validateDepositRecord(deposit);
    if (depositErrors.length > 0) {
        return res.status(400).json({ error: "invalid_deposit", details: depositErrors });
    }

    const toleranceBps =
        typeof body.toleranceBps === "number" && body.toleranceBps >= 0
            ? body.toleranceBps
            : DEFAULT_DEPOSIT_AMOUNT_TOLERANCE_BPS;

    let order;
    if (typeof body.orderId === "string" && body.orderId.trim()) {
        order = getFiatToCryptoOrderById(body.orderId.trim());
    } else {
        const submitted = listFiatToCryptoOrdersByStatus(FIAT_TO_CRYPTO_ORDER_STATUS.SUBMITTED);
        order = findOrderForDeposit(deposit, submitted);
    }

    const complianceScreening =
        body.complianceScreening && typeof body.complianceScreening === "object"
            ? {
                  amlCheckStatus:
                      typeof body.complianceScreening.amlCheckStatus === "string"
                          ? body.complianceScreening.amlCheckStatus.trim()
                          : "",
                  sanctionsCheckStatus:
                      typeof body.complianceScreening.sanctionsCheckStatus === "string"
                          ? body.complianceScreening.sanctionsCheckStatus.trim()
                          : "",
              }
            : undefined;

    const result = reconcileDeposit({
        deposit,
        order,
        priorReconciledDepositIds: listReconciledDepositIds(),
        actor: adminUserId,
        notes: typeof body.notes === "string" ? body.notes : undefined,
        toleranceBps,
        uuidFactory: () => randomUUID(),
        ...(complianceScreening ? { complianceScreening } : {}),
    });

    saveReconciledDeposit(deposit);

    let updated = order;
    if (result.orderPatch && order) {
        updated = updateFiatToCryptoOrder(order.id, result.orderPatch);
    }

    const ok = result.outcome === "matched";
    const status = ok ? 200 : 409;
    return res.status(status).json({ ok, outcome: result.outcome, event: result.event, order: updated });
}
