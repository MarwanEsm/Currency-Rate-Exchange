/**
 * Fiat-to-crypto order — request lifecycle, data model, and validation (FCX-17).
 *
 * Purpose: give operations and engineering a single, code-backed definition of how an
 * order moves from submission through fulfillment, what data we persist, who drives each
 * transition, and which fields are mandatory before an order is accepted.
 *
 * ## Order statuses
 *
 * | Status        | Meaning |
 * |---------------|---------|
 * | `submitted`   | Customer request recorded; awaiting fiat settlement / payment confirmation. |
 * | `paid`        | Fiat received or payment processor confirmed good funds. |
 * | `purchasing`  | Treasury / liquidity is acquiring the target crypto asset at agreed terms. |
 * | `transferring`| Asset is being sent to the customer wallet (on-chain or custodial payout). |
 * | `completed`   | Terminal — customer received expected asset; balances reconciled. |
 * | `failed`      | Terminal — could not complete; requires ops follow-up (new order or manual refund). |
 *
 * ## Lifecycle transitions and ownership
 *
 * Ownership describes the **system or team that is authoritative** to record the transition
 * in the ledger of record (not necessarily who clicks a button in UI).
 *
 * Transitions are listed in `FIAT_TO_CRYPTO_ORDER_TRANSITIONS`. Terminal states have no
 * outgoing transitions in this table; retries are modeled as **new** orders or separate
 * compensating workflows outside this minimal state machine.
 *
 * ## Validation
 *
 * Use `validateFiatToCryptoOrderDraft` for required-field checks on create/submit payloads.
 * Stricter per-asset or per-chain rules (e.g. memo tag, contract address whitelist) should be
 * layered by the payment and custody integrations that consume this model.
 */

export const FIAT_TO_CRYPTO_ORDER_STATUS = {
    SUBMITTED: "submitted",
    PAID: "paid",
    PURCHASING: "purchasing",
    TRANSFERRING: "transferring",
    COMPLETED: "completed",
    FAILED: "failed",
};

/** @typedef {typeof FIAT_TO_CRYPTO_ORDER_STATUS[keyof typeof FIAT_TO_CRYPTO_ORDER_STATUS]} FiatToCryptoOrderStatus */

/**
 * Actors authorized to record transitions in the system of record.
 *
 * @typedef {'user' | 'payment_processor' | 'treasury' | 'custody' | 'operations' | 'system'} FiatToCryptoTransitionOwner
 */

/**
 * Ordered declarative list: valid edges + who owns recording the transition.
 *
 * @type {ReadonlyArray<{
 *   from: FiatToCryptoOrderStatus,
 *   to: FiatToCryptoOrderStatus,
 *   owner: FiatToCryptoTransitionOwner,
 *   description: string
 * }>}
 */
export const FIAT_TO_CRYPTO_ORDER_TRANSITIONS = Object.freeze([
    {
        from: FIAT_TO_CRYPTO_ORDER_STATUS.SUBMITTED,
        to: FIAT_TO_CRYPTO_ORDER_STATUS.PAID,
        owner: "payment_processor",
        description: "Fiat funds captured or confirmed against the order quote.",
    },
    {
        from: FIAT_TO_CRYPTO_ORDER_STATUS.SUBMITTED,
        to: FIAT_TO_CRYPTO_ORDER_STATUS.FAILED,
        owner: "system",
        description: "Order rejected or expired before payment (validation, risk, or timeout).",
    },
    {
        from: FIAT_TO_CRYPTO_ORDER_STATUS.PAID,
        to: FIAT_TO_CRYPTO_ORDER_STATUS.PURCHASING,
        owner: "treasury",
        description: "Good funds acknowledged; acquisition of target asset begins.",
    },
    {
        from: FIAT_TO_CRYPTO_ORDER_STATUS.PAID,
        to: FIAT_TO_CRYPTO_ORDER_STATUS.FAILED,
        owner: "operations",
        description: "Cannot honor purchase after payment (compliance halt, quote invalidation).",
    },
    {
        from: FIAT_TO_CRYPTO_ORDER_STATUS.PURCHASING,
        to: FIAT_TO_CRYPTO_ORDER_STATUS.TRANSFERRING,
        owner: "custody",
        description: "Asset acquired; payout to customer wallet is in progress.",
    },
    {
        from: FIAT_TO_CRYPTO_ORDER_STATUS.PURCHASING,
        to: FIAT_TO_CRYPTO_ORDER_STATUS.FAILED,
        owner: "treasury",
        description: "Could not obtain liquidity or settlement at required parameters.",
    },
    {
        from: FIAT_TO_CRYPTO_ORDER_STATUS.TRANSFERRING,
        to: FIAT_TO_CRYPTO_ORDER_STATUS.COMPLETED,
        owner: "custody",
        description: "Payout confirmed on destination network / custodial completion criteria met.",
    },
    {
        from: FIAT_TO_CRYPTO_ORDER_STATUS.TRANSFERRING,
        to: FIAT_TO_CRYPTO_ORDER_STATUS.FAILED,
        owner: "custody",
        description: "Payout failed or was reverted; funds require manual reconciliation.",
    },
]);

const transitionsByFrom = () => {
    /** @type {Record<string, Set<string>>} */
    const map = {};
    for (const row of FIAT_TO_CRYPTO_ORDER_TRANSITIONS) {
        if (!map[row.from]) map[row.from] = new Set();
        map[row.from].add(row.to);
    }
    return map;
};

const BY_FROM = transitionsByFrom();

/**
 * @param {string} status
 * @returns {status is FiatToCryptoOrderStatus}
 */
export const isFiatToCryptoOrderStatus = (status) =>
    Object.values(FIAT_TO_CRYPTO_ORDER_STATUS).includes(/** @type {FiatToCryptoOrderStatus} */ (status));

/**
 * @param {FiatToCryptoOrderStatus} fromStatus
 * @param {FiatToCryptoOrderStatus} toStatus
 * @returns {boolean}
 */
export const isFiatToCryptoOrderTransitionAllowed = (fromStatus, toStatus) =>
    Boolean(BY_FROM[fromStatus]?.has(toStatus));

/**
 * @param {FiatToCryptoOrderStatus} fromStatus
 * @param {FiatToCryptoOrderStatus} toStatus
 * @returns {FiatToCryptoTransitionOwner | null}
 */
export const getFiatToCryptoOrderTransitionOwner = (fromStatus, toStatus) => {
    const row = FIAT_TO_CRYPTO_ORDER_TRANSITIONS.find((t) => t.from === fromStatus && t.to === toStatus);
    return row ? row.owner : null;
};

/**
 * @param {FiatToCryptoOrderStatus} status
 * @returns {ReadonlyArray<FiatToCryptoOrderStatus>}
 */
export const getAllowedFiatToCryptoOrderNextStatuses = (status) => {
    const next = BY_FROM[status];
    return next ? Array.from(next) : [];
};

/**
 * Logical persisted shape for a fiat-to-crypto order (storage-agnostic).
 *
 * @typedef {{
 *   id: string,
 *   userId: string,
 *   fiatCurrency: string,
 *   fiatAmount: string,
 *   targetAssetCode: string,
 *   walletAddress: string,
 *   network?: string,
 *   feeQuoteFiat?: string,
 *   feeActualFiat?: string,
 *   networkFeeAsset?: string,
 *   status: FiatToCryptoOrderStatus,
 *   failureCode?: string,
 *   failureMessage?: string,
 *   idempotencyKey?: string,
 *   createdAt: string,
 *   updatedAt: string,
 *   submittedAt?: string,
 *   paidAt?: string,
 *   purchasingAt?: string,
 *   transferringAt?: string,
 *   completedAt?: string,
 *   failedAt?: string,
 *   createdByUserId?: string,
 *   lastUpdatedBy?: string,
 * }} FiatToCryptoOrder
 *
 * Field notes:
 * - `fiatAmount` / fee fields as **strings** preserve decimal precision; normalize to minor units
 *   at persistence boundaries if required.
 * - `walletAddress` is the customer destination for `targetAssetCode` (plus optional `network`).
 * - Audit: `createdAt` / `updatedAt` ISO 8601; optional milestone timestamps mirror status history.
 * - `failureCode` / `failureMessage` should be set when entering `failed` for supportability.
 */

const WALLET_ADDRESS_MIN_LEN = 8;
const WALLET_ADDRESS_MAX_LEN = 256;

/**
 * @param {unknown} value
 * @returns {string[]}
 */
export const validateFiatToCryptoOrderDraft = (value) => {
    const errors = [];
    if (!value || typeof value !== "object") {
        errors.push("Order payload must be an object.");
        return errors;
    }

    const o = /** @type {Record<string, unknown>} */ (value);

    const userId = o.userId;
    if (typeof userId !== "string" || userId.trim() === "") {
        errors.push("`userId` is required (non-empty string).");
    }

    const fiatCurrency = o.fiatCurrency;
    if (typeof fiatCurrency !== "string" || fiatCurrency.trim() === "") {
        errors.push("`fiatCurrency` is required (non-empty ISO-like code).");
    }

    const fiatAmount = o.fiatAmount;
    if (typeof fiatAmount !== "string" || fiatAmount.trim() === "") {
        errors.push("`fiatAmount` is required (non-empty decimal string).");
    } else if (!/^\d+(\.\d+)?$/.test(fiatAmount.trim())) {
        errors.push("`fiatAmount` must be a non-negative decimal string.");
    } else if (Number(fiatAmount) <= 0) {
        errors.push("`fiatAmount` must be greater than zero.");
    }

    const targetAssetCode = o.targetAssetCode;
    if (typeof targetAssetCode !== "string" || targetAssetCode.trim() === "") {
        errors.push("`targetAssetCode` is required (non-empty string, e.g. BTC).");
    }

    const walletAddress = o.walletAddress;
    if (typeof walletAddress !== "string" || walletAddress.trim() === "") {
        errors.push("`walletAddress` is required (non-empty string).");
    } else {
        const w = walletAddress.trim();
        if (w.length < WALLET_ADDRESS_MIN_LEN || w.length > WALLET_ADDRESS_MAX_LEN) {
            errors.push(
                `\`walletAddress\` length must be between ${WALLET_ADDRESS_MIN_LEN} and ${WALLET_ADDRESS_MAX_LEN} characters.`,
            );
        }
    }

    const network = o.network;
    if (network !== undefined && network !== null && typeof network !== "string") {
        errors.push("`network`, when provided, must be a string (e.g. mainnet, ERC20).");
    }

    return errors;
};
