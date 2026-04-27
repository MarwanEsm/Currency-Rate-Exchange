import { ADMIN_PERMISSION, hasAdminPermission, normalizeAdminRoles } from "@/domain/adminPermissions";
import { getDepositReconciliationAuditLogSnapshot } from "@/domain/fiatToCryptoDeposit";

/**
 * GET /api/fiat-to-crypto/admin/deposits/log — full reconciliation audit log for ops review (FCX-23, FCX-41).
 * In production this must read from a durable audit sink, not an in-memory buffer.
 */
export default function handler(req, res) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
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

    const events = getDepositReconciliationAuditLogSnapshot();
    return res.status(200).json({ events });
}
