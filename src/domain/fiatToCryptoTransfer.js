import { FIAT_TO_CRYPTO_ORDER_STATUS } from "./fiatToCryptoOrder";
import {
    ASSET_PRIMARY_NETWORK,
    CRYPTO_TRANSFER_NETWORK_ID,
    FIAT_TO_CRYPTO_MAJOR_TARGET_ASSETS,
} from "./fiatToCryptoSupportedAssets";

/**
 * Secure crypto payout to customer destination (FCX-21, FCX-45).
 *
 * This module does **not** sign or broadcast transactions (that belongs in custody / HSM
 * infrastructure). It provides:
 *
 * - **Configured networks** per target asset (`ASSET_ALLOWED_TRANSFER_NETWORKS`).
 * - **Pre-send validation** of destination address for the chosen network.
 * - **Order detail fields** for persisting and exposing a broadcast transaction hash.
 * - **Failure / exception policy** for custody when `transferring` → `failed` (no on-chain
 *   “rollback”; compensation is operational).
 */

export { CRYPTO_TRANSFER_NETWORK_ID, FIAT_TO_CRYPTO_MAJOR_TARGET_ASSETS } from "./fiatToCryptoSupportedAssets";

for (const code of FIAT_TO_CRYPTO_MAJOR_TARGET_ASSETS) {
    if (!Object.prototype.hasOwnProperty.call(ASSET_PRIMARY_NETWORK, code)) {
        throw new Error(`fiatToCryptoSupportedAssets: missing ASSET_PRIMARY_NETWORK for ${code}`);
    }
}

/**
 * One primary chain per ticker (matches `ASSET_PRIMARY_NETWORK`).
 * @type {Readonly<Record<string, ReadonlyArray<string>>>}
 */
export const ASSET_ALLOWED_TRANSFER_NETWORKS = Object.freeze(
    Object.fromEntries(FIAT_TO_CRYPTO_MAJOR_TARGET_ASSETS.map((code) => [code, [ASSET_PRIMARY_NETWORK[code]]])),
);

/** Payout address length bounds (aligned with order draft validation). */
const WALLET_MIN = 8;
const WALLET_MAX = 256;

export const CRYPTO_TRANSFER_ERROR_CODES = {
    UNSUPPORTED_TARGET_ASSET: "unsupported_target_asset",
    UNSUPPORTED_OR_MISSING_NETWORK: "unsupported_or_missing_network",
    INVALID_ADDRESS_FOR_NETWORK: "invalid_address_for_network",
    NETWORK_REQUIRED: "network_required",
};

/** Admin / custody transfer actions (`record_broadcast`, `mark_completed`, `mark_failed`). */
export const CRYPTO_TRANSFER_ADMIN_ERROR_CODES = {
    ORDER_NOT_IN_TRANSFERRING: "order_not_in_transferring",
    INVALID_TX_HASH: "invalid_tx_hash",
    NETWORK_MISMATCH: "network_mismatch",
    BROADCAST_ALREADY_RECORDED: "broadcast_already_recorded",
    BROADCAST_REQUIRED_BEFORE_COMPLETE: "broadcast_required_before_complete",
    INVALID_DELIVERED_AMOUNT: "invalid_delivered_amount",
    UNKNOWN_ACTION: "unknown_transfer_action",
    REASON_REQUIRED: "transfer_failure_reason_required",
};

const DELIVERED_AMOUNT_RE = /^\d+(?:\.\d+)?$/;

/**
 * @param {string | undefined | null} txHash
 * @returns {{ ok: true, normalized: string } | { ok: false, code: string, message: string }}
 */
export const validateTransferTxHash = (txHash) => {
    const raw = String(txHash ?? "").trim();
    if (raw.length < 8 || raw.length > 128) {
        return {
            ok: false,
            code: CRYPTO_TRANSFER_ADMIN_ERROR_CODES.INVALID_TX_HASH,
            message: "txHash must be between 8 and 128 characters.",
        };
    }
    const hex = raw.startsWith("0x") || raw.startsWith("0X") ? raw.slice(2) : raw;
    if (!/^[a-fA-F0-9]+$/.test(hex) || hex.length < 8) {
        return {
            ok: false,
            code: CRYPTO_TRANSFER_ADMIN_ERROR_CODES.INVALID_TX_HASH,
            message: "txHash must be hexadecimal (optional 0x prefix).",
        };
    }
    const normalized = raw.startsWith("0x") || raw.startsWith("0X") ? `0x${hex.toLowerCase()}` : hex.toLowerCase();
    return { ok: true, normalized };
};

/**
 * Records an on-chain / custodial broadcast id on an order in `transferring`.
 *
 * @param {import("./fiatToCryptoOrder.js").FiatToCryptoOrder} order
 * @param {{ txHash: string, network?: string | null, broadcastAtIso?: string, actor?: string }} input
 * @returns {{ ok: true, patch: Record<string, unknown> } | { ok: false, errors: Array<{ code: string, message: string }> }}
 */
export const buildTransferBroadcastOrderPatch = (order, input) => {
    if (!order || order.status !== FIAT_TO_CRYPTO_ORDER_STATUS.TRANSFERRING) {
        return {
            ok: false,
            errors: [
                {
                    code: CRYPTO_TRANSFER_ADMIN_ERROR_CODES.ORDER_NOT_IN_TRANSFERRING,
                    message: `Order must be in ${FIAT_TO_CRYPTO_ORDER_STATUS.TRANSFERRING}.`,
                },
            ],
        };
    }

    const dest = validateCryptoTransferDestination({
        targetAssetCode: order.targetAssetCode,
        network: order.network,
        walletAddress: order.walletAddress,
    });
    if (!dest.ok) {
        return { ok: false, errors: dest.errors };
    }
    const canonical = dest.canonicalNetwork;

    const rawNet = input.network === undefined || input.network === null ? "" : String(input.network).trim();
    if (rawNet !== "") {
        const resolved = resolveTransferNetwork(order.targetAssetCode, rawNet);
        if (!resolved.ok || resolved.canonicalNetwork !== canonical) {
            return {
                ok: false,
                errors: [
                    {
                        code: CRYPTO_TRANSFER_ADMIN_ERROR_CODES.NETWORK_MISMATCH,
                        message: `network must match the payout chain for this order (${canonical}).`,
                    },
                ],
            };
        }
    }

    const tx = validateTransferTxHash(input.txHash);
    if (!tx.ok) {
        return { ok: false, errors: [{ code: tx.code, message: tx.message }] };
    }

    const existing = order.transferTxHash?.trim();
    if (existing) {
        if (existing === tx.normalized) {
            return { ok: true, patch: {} };
        }
        return {
            ok: false,
            errors: [
                {
                    code: CRYPTO_TRANSFER_ADMIN_ERROR_CODES.BROADCAST_ALREADY_RECORDED,
                    message: "A different transferTxHash is already recorded for this order.",
                },
            ],
        };
    }

    const now = input.broadcastAtIso ?? new Date().toISOString();
    const broadcastPatch = buildOrderTransferBroadcastPatch({
        txHash: tx.normalized,
        network: canonical,
        broadcastAtIso: now,
    });
    return {
        ok: true,
        patch: {
            ...broadcastPatch,
            updatedAt: now,
            ...(input.actor ? { lastUpdatedBy: input.actor } : {}),
        },
    };
};

/**
 * Completes the order after payout is confirmed (custody-owned `transferring` → `completed`).
 *
 * @param {import("./fiatToCryptoOrder.js").FiatToCryptoOrder} order
 * @param {{
 *   deliveredAssetAmount: string,
 *   deliveredAssetCode?: string | null,
 *   transferTxConfirmedAt?: string | null,
 *   now?: string,
 *   actor?: string,
 * }} input
 * @returns {{ ok: true, patch: Record<string, unknown> } | { ok: false, errors: Array<{ code: string, message: string }> }}
 */
export const buildTransferCompletedOrderPatch = (order, input) => {
    if (!order || order.status !== FIAT_TO_CRYPTO_ORDER_STATUS.TRANSFERRING) {
        return {
            ok: false,
            errors: [
                {
                    code: CRYPTO_TRANSFER_ADMIN_ERROR_CODES.ORDER_NOT_IN_TRANSFERRING,
                    message: `Order must be in ${FIAT_TO_CRYPTO_ORDER_STATUS.TRANSFERRING}.`,
                },
            ],
        };
    }

    if (!order.transferTxHash?.trim()) {
        return {
            ok: false,
            errors: [
                {
                    code: CRYPTO_TRANSFER_ADMIN_ERROR_CODES.BROADCAST_REQUIRED_BEFORE_COMPLETE,
                    message: "Record a transferTxHash (broadcast) before completing the order.",
                },
            ],
        };
    }

    const dest = validateCryptoTransferDestination({
        targetAssetCode: order.targetAssetCode,
        network: order.network,
        walletAddress: order.walletAddress,
    });
    if (!dest.ok) {
        return { ok: false, errors: dest.errors };
    }

    const amount = String(input.deliveredAssetAmount ?? "").trim();
    if (!DELIVERED_AMOUNT_RE.test(amount) || Number(amount) <= 0) {
        return {
            ok: false,
            errors: [
                {
                    code: CRYPTO_TRANSFER_ADMIN_ERROR_CODES.INVALID_DELIVERED_AMOUNT,
                    message: "deliveredAssetAmount must be a positive decimal string.",
                },
            ],
        };
    }

    const code = String(
        input.deliveredAssetCode ?? order.netCryptoAssetCode ?? order.targetAssetCode ?? "",
    )
        .trim()
        .toUpperCase();
    const now = input.now ?? new Date().toISOString();
    const confirmedAt = input.transferTxConfirmedAt?.trim() || now;

    return {
        ok: true,
        patch: {
            status: FIAT_TO_CRYPTO_ORDER_STATUS.COMPLETED,
            completedAt: now,
            updatedAt: now,
            transferTxConfirmedAt: confirmedAt,
            deliveredAssetAmount: amount,
            deliveredAssetCode: code,
            ...(input.actor ? { lastUpdatedBy: input.actor } : {}),
        },
    };
};

/**
 * @param {import("./fiatToCryptoOrder.js").FiatToCryptoOrder} order
 * @param {{
 *   failureMessage: string,
 *   failureCode?: string,
 *   now?: string,
 *   actor?: string,
 * }} input
 * @returns {{ ok: true, patch: Record<string, unknown> } | { ok: false, errors: Array<{ code: string, message: string }> }}
 */
export const buildTransferFailedOrderPatch = (order, input) => {
    if (!order || order.status !== FIAT_TO_CRYPTO_ORDER_STATUS.TRANSFERRING) {
        return {
            ok: false,
            errors: [
                {
                    code: CRYPTO_TRANSFER_ADMIN_ERROR_CODES.ORDER_NOT_IN_TRANSFERRING,
                    message: `Order must be in ${FIAT_TO_CRYPTO_ORDER_STATUS.TRANSFERRING}.`,
                },
            ],
        };
    }

    const msg = String(input.failureMessage ?? "").trim();
    if (msg.length < 3) {
        return {
            ok: false,
            errors: [
                {
                    code: CRYPTO_TRANSFER_ADMIN_ERROR_CODES.REASON_REQUIRED,
                    message: "failureMessage must be at least 3 characters.",
                },
            ],
        };
    }

    const now = input.now ?? new Date().toISOString();
    return {
        ok: true,
        patch: {
            status: FIAT_TO_CRYPTO_ORDER_STATUS.FAILED,
            failedAt: now,
            updatedAt: now,
            failureCode: input.failureCode ?? "transfer_failed",
            failureMessage: msg,
            ...(input.actor ? { lastUpdatedBy: input.actor } : {}),
        },
    };
};

/**
 * When `network` is omitted, default only for assets with a single supported network.
 *
 * @param {string} targetAssetCode
 * @param {string | undefined | null} network
 * @returns {{ ok: true, canonicalNetwork: string } | { ok: false, code: string, message: string }}
 */
export const resolveTransferNetwork = (targetAssetCode, network) => {
    const asset = String(targetAssetCode ?? "").trim().toUpperCase();
    const allowed = ASSET_ALLOWED_TRANSFER_NETWORKS[asset];
    if (!allowed || allowed.length === 0) {
        return {
            ok: false,
            code: CRYPTO_TRANSFER_ERROR_CODES.UNSUPPORTED_TARGET_ASSET,
            message: `Transfers are not configured for asset "${asset}".`,
        };
    }

    const raw = network === undefined || network === null ? "" : String(network).trim();
    if (raw === "") {
        if (allowed.length === 1) {
            return { ok: true, canonicalNetwork: allowed[0] };
        }
        return {
            ok: false,
            code: CRYPTO_TRANSFER_ERROR_CODES.NETWORK_REQUIRED,
            message: `Network is required for asset "${asset}" (multiple chains supported).`,
        };
    }

    const normalized = raw.toLowerCase().replace(/-/g, "_");
    const match = allowed.find((id) => id === normalized || id === raw);
    if (!match) {
        return {
            ok: false,
            code: CRYPTO_TRANSFER_ERROR_CODES.UNSUPPORTED_OR_MISSING_NETWORK,
            message: `Network "${raw}" is not enabled for asset "${asset}".`,
        };
    }

    return { ok: true, canonicalNetwork: match };
};

/**
 * @param {string} address
 * @param {string} canonicalNetwork
 * @returns {boolean}
 */
const isValidAddressForNetwork = (address, canonicalNetwork) => {
    const a = String(address ?? "").trim();
    if (a.length < WALLET_MIN || a.length > WALLET_MAX) return false;

    const N = CRYPTO_TRANSFER_NETWORK_ID;

    switch (canonicalNetwork) {
        case N.BITCOIN_MAINNET:
            if (/^bc1[0-9a-z]{39,87}$/i.test(a)) return true;
            if (/^1[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(a)) return true;
            if (/^3[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(a)) return true;
            return false;

        case N.ETHEREUM_MAINNET:
            return /^0x[a-fA-F0-9]{40}$/.test(a);

        case N.SOLANA_MAINNET:
            return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a);

        case N.LITECOIN_MAINNET:
            return /^(?:[LM][a-km-zA-HJ-NP-Z1-9]{26,33}|lt1[a-z0-9]{39,87}|ltc1[a-z0-9]{39,87})$/i.test(a);

        case N.DOGECOIN_MAINNET:
            return /^D[5-9A-HJ-NP-Za-km-z]{33}$/.test(a);

        case N.RIPPLE_MAINNET:
            return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(a);

        case N.CARDANO_MAINNET:
            return /^addr1[a-z0-9]{50,110}$/i.test(a);

        case N.COSMOS_FAMILY_MAINNET:
            return /^[a-z]{3,14}1[a-z0-9]{38,96}$/.test(a);

        case N.POLKADOT_MAINNET:
            return /^[1-9A-HJ-NP-Za-km-z]{46,52}$/.test(a);

        case N.BITCOIN_CASH_MAINNET:
            return /^((bitcoincash:)?)?[qp][a-z0-9]{41}$/i.test(a);

        case N.NEAR_MAINNET:
            return /^([a-f0-9]{64}|[^\s.]+\.near)$/i.test(a);

        case N.FILECOIN_MAINNET:
            return /^f[134][a-z0-9]{39,}$/i.test(a);

        case N.HEX64_ACCOUNT_MAINNET:
            return /^0x[a-fA-F0-9]{64}$/.test(a);

        case N.EOS_MAINNET:
            return /^[a-z1-5.]{3,12}$/.test(a);

        case N.TEZOS_MAINNET:
            return /^tz[123][a-zA-Z0-9]{33}$/.test(a);

        case N.STELLAR_MAINNET:
            return /^G[A-Z2-7]{55}$/.test(a);

        case N.ZCASH_MAINNET:
            return /^([st][13][a-zA-Z0-9]{33,}|zs[a-zA-Z0-9]{93})$/.test(a);

        case N.HEDERA_MAINNET:
            return /^0\.0\.[0-9]{4,}$/.test(a);

        case N.STACKS_MAINNET:
            return /^S[PM][A-Z0-9]{38,60}$/.test(a);

        case N.TON_MAINNET:
            return /^[EU][Q][A-Za-z0-9_-]{46}$/.test(a);

        default:
            return false;
    }
};

/**
 * Validates destination **before** custody broadcasts (network + address compatibility).
 *
 * @param {{ targetAssetCode: string, network?: string | null, walletAddress: string }} input
 * @returns {{ ok: true, canonicalNetwork: string } | { ok: false, errors: Array<{ code: string, message: string }> }}
 */
export const validateCryptoTransferDestination = (input) => {
    const errors = [];
    const resolved = resolveTransferNetwork(input.targetAssetCode, input.network);
    if (!resolved.ok) {
        errors.push({ code: resolved.code, message: resolved.message });
        return { ok: false, errors };
    }

    const addr = input.walletAddress;
    if (typeof addr !== "string" || addr.trim() === "") {
        errors.push({
            code: CRYPTO_TRANSFER_ERROR_CODES.INVALID_ADDRESS_FOR_NETWORK,
            message: "`walletAddress` is required for transfer validation.",
        });
        return { ok: false, errors };
    }

    if (!isValidAddressForNetwork(addr, resolved.canonicalNetwork)) {
        errors.push({
            code: CRYPTO_TRANSFER_ERROR_CODES.INVALID_ADDRESS_FOR_NETWORK,
            message: `Destination is not valid for network "${resolved.canonicalNetwork}".`,
        });
        return { ok: false, errors };
    }

    return { ok: true, canonicalNetwork: resolved.canonicalNetwork };
};

/**
 * Patch to merge onto an order after a successful **broadcast** (custody should persist these
 * so APIs/UI can expose transaction tracking).
 *
 * @param {{
 *   txHash: string,
 *   network: string,
 *   broadcastAtIso?: string,
 * }} payload
 * @returns {{
 *   transferTxHash: string,
 *   transferCanonicalNetwork: string,
 *   transferTxBroadcastAt: string,
 * }}
 */
export const buildOrderTransferBroadcastPatch = (payload) => {
    const broadcastAtIso = payload.broadcastAtIso ?? new Date().toISOString();
    const hash = String(payload.txHash ?? "").trim();
    const network = String(payload.network ?? "").trim();
    return {
        transferTxHash: hash,
        transferCanonicalNetwork: network,
        transferTxBroadcastAt: broadcastAtIso,
    };
};

/**
 * Structured guidance when payout leaves `transferring` as **failed** (exception path).
 * On-chain sends cannot be rolled back; ops follows compensation / re-broadcast policy.
 *
 * @typedef {{
 *   orderStatusPath: string,
 *   custodyActions: string[],
 *   customerComms: string[],
 *   dataToCapture: string[],
 * }} TransferFailureHandlingGuide
 */

/** @type {TransferFailureHandlingGuide} */
export const TRANSFER_FAILURE_EXCEPTION_PATH = Object.freeze({
    orderStatusPath:
        "Move order `transferring` → `failed` via custody-owned transition; set `failureCode` / `failureMessage` (e.g. broadcast rejected, insufficient gas, chain timeout).",
    custodyActions: [
        "Verify whether the transaction actually reached the mempool or chain (explorer / node).",
        "If no broadcast occurred, safe to retry broadcast with same idempotency key if policy allows.",
        "If broadcast confirmed but wrong amount/asset, freeze automation and open incident; do not mark completed.",
        "If funds returned to hot wallet, reconcile balances before any customer refund.",
    ],
    customerComms: [
        "Do not promise automatic on-chain rollback; explain manual reconciliation timeline.",
        "Provide support ticket reference and next steps (refund fiat, re-attempt payout, etc.).",
    ],
    dataToCapture: [
        "Attempt id / correlation id",
        "Raw RPC or custodian error codes",
        "`transferTxHash` if any partial hash was generated",
        "Block height / timestamp of last known good state",
    ],
});
