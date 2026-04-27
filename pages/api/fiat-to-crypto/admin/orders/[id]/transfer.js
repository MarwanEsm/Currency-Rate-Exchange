import { ADMIN_PERMISSION, hasAdminPermission, normalizeAdminRoles } from "@/domain/adminPermissions";
import {
    buildTransferBroadcastOrderPatch,
    buildTransferCompletedOrderPatch,
    buildTransferFailedOrderPatch,
    CRYPTO_TRANSFER_ADMIN_ERROR_CODES,
} from "@/domain/fiatToCryptoTransfer";
import { getFiatToCryptoOrderById, updateFiatToCryptoOrder } from "@/server/inMemoryFiatToCryptoOrders";

/**
 * POST /api/fiat-to-crypto/admin/orders/[id]/transfer — custody crypto payout (FCX-45).
 *
 * Body:
 * - `{ action: "record_broadcast", txHash: string, network?: string }`
 * - `{ action: "mark_completed", deliveredAssetAmount: string, deliveredAssetCode?: string, transferTxConfirmedAt?: string }`
 * - `{ action: "mark_failed", failureMessage: string, failureCode?: string }`
 *
 * Requires `record_crypto_transfer`. Order must be in `transferring`.
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

    if (!adminUserId || !hasAdminPermission(roles, ADMIN_PERMISSION.RECORD_CRYPTO_TRANSFER)) {
        return res.status(403).json({ error: "forbidden" });
    }

    const id = typeof req.query?.id === "string" ? req.query.id : Array.isArray(req.query?.id) ? req.query.id[0] : "";
    if (!id) return res.status(400).json({ error: "order id is required" });

    const order = getFiatToCryptoOrderById(id);
    if (!order) return res.status(404).json({ error: "order_not_found" });

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const action = typeof body.action === "string" ? body.action.trim() : "";

    /** @type {{ ok: true, patch: Record<string, unknown> } | { ok: false, errors: Array<{ code: string, message: string }> }} */
    let built;
    if (action === "record_broadcast") {
        const txHash = typeof body.txHash === "string" ? body.txHash : "";
        const network = body.network !== undefined && body.network !== null ? String(body.network) : undefined;
        built = buildTransferBroadcastOrderPatch(order, { txHash, network, actor: adminUserId });
    } else if (action === "mark_completed") {
        const deliveredAssetAmount = typeof body.deliveredAssetAmount === "string" ? body.deliveredAssetAmount : "";
        const deliveredAssetCode =
            typeof body.deliveredAssetCode === "string" ? body.deliveredAssetCode : undefined;
        const transferTxConfirmedAt =
            typeof body.transferTxConfirmedAt === "string" ? body.transferTxConfirmedAt : undefined;
        built = buildTransferCompletedOrderPatch(order, {
            deliveredAssetAmount,
            deliveredAssetCode,
            transferTxConfirmedAt,
            actor: adminUserId,
        });
    } else if (action === "mark_failed") {
        const failureMessage = typeof body.failureMessage === "string" ? body.failureMessage : "";
        const failureCode = typeof body.failureCode === "string" ? body.failureCode : undefined;
        built = buildTransferFailedOrderPatch(order, { failureMessage, failureCode, actor: adminUserId });
    } else {
        return res.status(400).json({
            error: "invalid_action",
            code: CRYPTO_TRANSFER_ADMIN_ERROR_CODES.UNKNOWN_ACTION,
            allowed: ["record_broadcast", "mark_completed", "mark_failed"],
        });
    }

    if (!built.ok) {
        return res.status(400).json({
            error: "transfer_validation_failed",
            messages: built.errors.map((e) => e.message),
            codes: built.errors.map((e) => e.code),
        });
    }

    if (Object.keys(built.patch).length === 0) {
        return res.status(200).json({ ok: true, order, idempotent: true });
    }

    const updated = updateFiatToCryptoOrder(id, built.patch);
    return res.status(200).json({ ok: true, order: updated });
}
