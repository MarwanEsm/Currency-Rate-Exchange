import { randomUUID } from "crypto";
import { ADMIN_PERMISSION, hasAdminPermission, normalizeAdminRoles } from "@/domain/adminPermissions";
import {
    LIQUIDITY_PROVIDER_ID,
    buildExecutionOrderPatch,
    executePurchaseWithRetry,
    getRegisteredLiquidityProviderIds,
} from "@/domain/fiatToCryptoExecution";
import { getFiatToCryptoOrderById, updateFiatToCryptoOrder } from "@/server/inMemoryFiatToCryptoOrders";

/**
 * POST /api/fiat-to-crypto/admin/orders/[id]/execute-purchase — trigger liquidity purchase (FCX-24).
 *
 * Order must already be in `purchasing`. On success the order moves to `transferring` with fill
 * metadata (provider, fill price, fill quantity, attempts). On failure after retries, it moves to
 * `failed` with the last error code. Every attempt is written to the purchase execution audit log.
 *
 * Body: { providerId?: string, simulatedOutcome?: string, maxAttempts?: number }
 */
export default async function handler(req, res) {
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

    if (!adminUserId || !hasAdminPermission(roles, ADMIN_PERMISSION.EXECUTE_PURCHASE)) {
        return res.status(403).json({ error: "forbidden" });
    }

    const id = typeof req.query?.id === "string" ? req.query.id : Array.isArray(req.query?.id) ? req.query.id[0] : "";
    if (!id) return res.status(400).json({ error: "order id is required" });

    const order = getFiatToCryptoOrderById(id);
    if (!order) return res.status(404).json({ error: "order_not_found" });

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const providerId = typeof body.providerId === "string" ? body.providerId : LIQUIDITY_PROVIDER_ID.INTERNAL_SIMULATOR;
    const registered = getRegisteredLiquidityProviderIds();
    if (!registered.includes(providerId)) {
        return res.status(400).json({ error: "invalid_provider", registered });
    }
    const simulatedOutcome = typeof body.simulatedOutcome === "string" ? body.simulatedOutcome : undefined;
    const maxAttempts =
        typeof body.maxAttempts === "number" && Number.isInteger(body.maxAttempts) && body.maxAttempts > 0
            ? body.maxAttempts
            : undefined;

    const result = await executePurchaseWithRetry(order, {
        providerId,
        simulatedOutcome,
        maxAttempts,
        actor: adminUserId,
        uuidFactory: () => randomUUID(),
    });

    const patch = buildExecutionOrderPatch(order, result, { actor: adminUserId });
    const updated = updateFiatToCryptoOrder(id, patch);

    const status = result.ok ? 200 : 409;
    return res.status(status).json({
        ok: result.ok,
        order: updated,
        result,
    });
}
