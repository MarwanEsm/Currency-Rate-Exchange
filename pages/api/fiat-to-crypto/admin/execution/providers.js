import { ADMIN_PERMISSION, hasAdminPermission, normalizeAdminRoles } from "@/domain/adminPermissions";
import { getRegisteredLiquidityProviderIds } from "@/domain/fiatToCryptoExecution";

/**
 * GET /api/fiat-to-crypto/admin/execution/providers — registered liquidity provider ids (FCX-44).
 * Lets ops choose `providerId` when calling execute-purchase; demo ships `internal_simulator` only.
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

    const providers = getRegisteredLiquidityProviderIds();
    return res.status(200).json({ providers });
}
