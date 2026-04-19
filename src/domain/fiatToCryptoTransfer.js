/**
 * Secure crypto payout to customer destination (FCX-21).
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

/** Canonical network identifiers used in config, validation, and persisted `transferCanonicalNetwork`. */
export const CRYPTO_TRANSFER_NETWORK_ID = {
    BITCOIN_MAINNET: "bitcoin_mainnet",
    ETHEREUM_MAINNET: "ethereum_mainnet",
};

/**
 * Which networks are valid for each `targetAssetCode` (uppercase tickers).
 * Extend this map as new assets go live.
 */
export const ASSET_ALLOWED_TRANSFER_NETWORKS = Object.freeze({
    BTC: [CRYPTO_TRANSFER_NETWORK_ID.BITCOIN_MAINNET],
    ETH: [CRYPTO_TRANSFER_NETWORK_ID.ETHEREUM_MAINNET],
});

/** Payout address length bounds (aligned with order draft validation). */
const WALLET_MIN = 8;
const WALLET_MAX = 256;

export const CRYPTO_TRANSFER_ERROR_CODES = {
    UNSUPPORTED_TARGET_ASSET: "unsupported_target_asset",
    UNSUPPORTED_OR_MISSING_NETWORK: "unsupported_or_missing_network",
    INVALID_ADDRESS_FOR_NETWORK: "invalid_address_for_network",
    NETWORK_REQUIRED: "network_required",
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

    if (canonicalNetwork === CRYPTO_TRANSFER_NETWORK_ID.BITCOIN_MAINNET) {
        if (/^bc1[0-9a-z]{39,87}$/i.test(a)) return true;
        if (/^1[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(a)) return true;
        if (/^3[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(a)) return true;
        return false;
    }

    if (canonicalNetwork === CRYPTO_TRANSFER_NETWORK_ID.ETHEREUM_MAINNET) {
        return /^0x[a-fA-F0-9]{40}$/.test(a);
    }

    return false;
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
