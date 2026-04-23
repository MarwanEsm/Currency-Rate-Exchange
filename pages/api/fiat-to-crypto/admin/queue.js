import { ADMIN_PERMISSION, hasAdminPermission, normalizeAdminRoles } from "@/domain/adminPermissions";
import { selectPendingExecutableOrders } from "@/domain/fiatToCryptoAdminQueue";
import { FIAT_TO_CRYPTO_ORDER_STATUS } from "@/domain/fiatToCryptoOrder";
import { listFiatToCryptoOrdersByStatus } from "@/server/inMemoryFiatToCryptoOrders";

/**
 * GET /api/fiat-to-crypto/admin/queue — admin list of orders pending approval (FCX-26).
 *
 * Demo auth: admin identity and roles arrive via `x-admin-user-id` and `x-admin-roles` (comma-
 * separated). In production, resolve both from a verified Firebase ID token and a server-side
 * role store — do not trust headers alone.
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

    const paid = listFiatToCryptoOrdersByStatus(FIAT_TO_CRYPTO_ORDER_STATUS.PAID);
    const orders = selectPendingExecutableOrders(paid);
    return res.status(200).json({ orders });
}
