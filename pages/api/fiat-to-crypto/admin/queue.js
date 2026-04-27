import { ADMIN_PERMISSION, hasAdminPermission, normalizeAdminRoles } from "@/domain/adminPermissions";
import { selectPendingExecutableOrders } from "@/domain/fiatToCryptoAdminQueue";
import { FIAT_TO_CRYPTO_ORDER_STATUS } from "@/domain/fiatToCryptoOrder";
import { listFiatToCryptoOrdersByStatus } from "@/server/inMemoryFiatToCryptoOrders";

const ALLOWED_STATUSES = new Set([
    FIAT_TO_CRYPTO_ORDER_STATUS.SUBMITTED,
    FIAT_TO_CRYPTO_ORDER_STATUS.PAID,
    FIAT_TO_CRYPTO_ORDER_STATUS.PURCHASING,
    FIAT_TO_CRYPTO_ORDER_STATUS.TRANSFERRING,
]);

/**
 * GET /api/fiat-to-crypto/admin/queue?status=submitted|paid|purchasing|transferring — admin queue (FCX-43 + FCX-26 + FCX-24 + FCX-44 + FCX-45 + FCX-41).
 *
 * `submitted` lists orders awaiting fiat funding / deposit match (FCX-41). Default status is `paid`
 * (orders awaiting approval). `purchasing` returns orders approved and ready for liquidity-provider
 * execution. `transferring` lists orders awaiting payout broadcast / completion (FCX-45).
 *
 * Demo auth: admin identity and roles arrive via `x-admin-user-id` and `x-admin-roles` (comma-
 * separated). Production must resolve both from a verified session, not headers.
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

    const requestedStatus = typeof req.query?.status === "string" ? req.query.status : FIAT_TO_CRYPTO_ORDER_STATUS.PAID;
    if (!ALLOWED_STATUSES.has(requestedStatus)) {
        return res.status(400).json({ error: "invalid_status", allowed: [...ALLOWED_STATUSES] });
    }

    const byStatus = listFiatToCryptoOrdersByStatus(requestedStatus);
    const orders =
        requestedStatus === FIAT_TO_CRYPTO_ORDER_STATUS.PAID ? selectPendingExecutableOrders(byStatus) : byStatus;
    return res.status(200).json({ status: requestedStatus, orders });
}
