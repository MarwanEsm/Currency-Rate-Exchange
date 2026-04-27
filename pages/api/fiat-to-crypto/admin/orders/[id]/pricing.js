import { ADMIN_PERMISSION, hasAdminPermission, normalizeAdminRoles } from "@/domain/adminPermissions";
import {
    computeFiatToCryptoQuote,
    DEFAULT_COMMISSION_CONFIG,
    validateCommissionConfig,
} from "@/domain/fiatToCryptoPricing";
import { getFiatToCryptoOrderById } from "@/server/inMemoryFiatToCryptoOrders";

/**
 * POST /api/fiat-to-crypto/admin/orders/[id]/pricing — ops pricing preview (FCX-22, FCX-42).
 *
 * Does not mutate the order; returns the quote an approval would lock in, so operations can review
 * commission and net crypto amount before committing (FCX-42: visible before execution / purchase).
 *
 * Body: { exchangeRate: string, commissionConfig?: CommissionConfig }
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

    if (!adminUserId || !hasAdminPermission(roles, ADMIN_PERMISSION.VIEW_ORDER_QUEUE)) {
        return res.status(403).json({ error: "forbidden" });
    }

    const id = typeof req.query?.id === "string" ? req.query.id : Array.isArray(req.query?.id) ? req.query.id[0] : "";
    if (!id) return res.status(400).json({ error: "order id is required" });

    const order = getFiatToCryptoOrderById(id);
    if (!order) return res.status(404).json({ error: "order_not_found" });

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const exchangeRate = typeof body.exchangeRate === "string" ? body.exchangeRate.trim() : "";
    if (!exchangeRate) {
        return res.status(400).json({ error: "exchangeRate is required (positive decimal string)." });
    }
    const config = body.commissionConfig ?? DEFAULT_COMMISSION_CONFIG;
    const configErrors = validateCommissionConfig(config);
    if (configErrors.length > 0) {
        return res.status(400).json({ error: "invalid_commission_config", messages: configErrors });
    }

    try {
        const quote = computeFiatToCryptoQuote({
            fiatAmount: order.fiatAmount,
            fiatCurrency: order.fiatCurrency,
            targetAssetCode: order.targetAssetCode,
            exchangeRate,
            commissionConfig: config,
        });
        return res.status(200).json({ quote });
    } catch (e) {
        return res.status(400).json({ error: "pricing_failed", message: String(e?.message ?? e) });
    }
}
