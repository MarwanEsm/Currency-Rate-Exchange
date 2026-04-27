/**
 * Fiat-to-crypto order — request lifecycle, data model, and validation (FCX-17, FCX-38).
 *
 * Purpose: give operations and engineering a single, code-backed definition of how an
 * order moves from submission through fulfillment, what data we persist, who drives each
 * transition, and which fields are mandatory before an order is accepted.
 *
 * ## Data model (persisted shape — FCX-38)
 *
 * Grouping of `FiatToCryptoOrder` typedef fields (storage-agnostic; see typedef below):
 *
 * | Group | Fields (representative) |
 * |-------|-------------------------|
 * | **User & request** | `id`, `userId`, `fiatCurrency`, `fiatAmount`, `targetAssetCode`, `walletAddress`, optional `network` |
 * | **Fees & pricing** | `feeQuoteFiat`, `feeActualFiat`, `networkFeeAsset`, `grossFiatAmount`, `feeFiatAmount`, `netFiatAmount`, `exchangeRateApplied`, `netCryptoAmount`, `netCryptoAssetCode`, `commissionConfigSnapshot`, `pricingComputedAt`, `pricingWarnings` |
 * | **Status & failure** | `status`, `failureCode`, `failureMessage` |
 * | **Audit & idempotency** | `createdAt`, `updatedAt`, `submittedAt` … `failedAt`, `createdByUserId`, `lastUpdatedBy`, `idempotencyKey` |
 * | **Transfer (payout)** | `transferTxHash`, `transferCanonicalNetwork`, `transferTxBroadcastAt`, `transferTxConfirmedAt`, `deliveredAssetAmount`, `deliveredAssetCode` |
 * | **Execution (LP)** | `executionProviderId`, `executionProviderOrderId`, `executionFillPrice`, … `executionLastErrorCode` |
 * | **Deposit / reconciliation** | `depositId`, `depositAmount`, … `reconciliationNotes` |
 *
 * Amounts and rates are **strings** where noted to preserve decimal precision at boundaries.
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
 * ## Validation (FCX-38)
 *
 * **Required on draft / create** (see `FIAT_TO_CRYPTO_ORDER_REQUIRED_DRAFT_FIELDS`): `userId`,
 * `fiatCurrency`, `fiatAmount` (positive decimal string), `targetAssetCode`, `walletAddress`
 * (length bounds). **Optional:** `network` (must be string if present).
 *
 * Use `validateFiatToCryptoOrderDraft` for these checks. Intake / API layers add KYC, destination
 * format, commission config, and optional `exchangeRate` (see `fiatToCryptoIntake.js`).
 * Stricter per-asset rules (memo tag, contract whitelist) belong in payment and custody integrations.
 *
 * ## Compliance (FCX-19)
 *
 * Before persisting a **new** order (`submitted`), call `evaluateKycGateForOrderCreation` from
 * `fiatToCryptoCompliance.js`. Before `paid` → `purchasing`, call `evaluateAmlSanctionsGateForPurchasing`
 * or `evaluateFiatToCryptoOrderTransitionWithCompliance` so AML/sanctions and KYC-at-execution
 * rules are enforced and audit entries are emitted.
 *
 * ## Crypto payout (FCX-21)
 *
 * Before `transferring`, validate destination with `validateCryptoTransferDestination` in
 * `fiatToCryptoTransfer.js`. After broadcast, persist `transferTxHash`, `transferCanonicalNetwork`,
 * and `transferTxBroadcastAt` for order details and support.
 *
 * ## User progress & notifications (FCX-20)
 *
 * See `fiatToCryptoOrderProgress.js` for timelines, notification trigger keys, failure copy, and
 * completed-order delivery summaries for the user-facing experience.
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
 *   transferTxHash?: string,
 *   transferCanonicalNetwork?: string,
 *   transferTxBroadcastAt?: string,
 *   transferTxConfirmedAt?: string,
 *   deliveredAssetAmount?: string,
 *   deliveredAssetCode?: string,
 *   grossFiatAmount?: string,
 *   feeFiatAmount?: string,
 *   netFiatAmount?: string,
 *   exchangeRateApplied?: string,
 *   netCryptoAmount?: string,
 *   netCryptoAssetCode?: string,
 *   commissionConfigSnapshot?: import("./fiatToCryptoPricing.js").CommissionConfig,
 *   pricingComputedAt?: string,
 *   pricingWarnings?: ReadonlyArray<string>,
 *   executionProviderId?: string,
 *   executionProviderOrderId?: string,
 *   executionFillPrice?: string,
 *   executionFillQuantity?: string,
 *   executionFilledAssetCode?: string,
 *   executionExecutedAt?: string,
 *   executionAttempts?: number,
 *   executionLastErrorCode?: string,
 *   depositId?: string,
 *   depositAmount?: string,
 *   depositCurrency?: string,
 *   depositReference?: string,
 *   depositReceivedAt?: string,
 *   reconciledAt?: string,
 *   reconciliationOutcome?: string,
 *   reconciliationVariance?: string,
 *   reconciliationNotes?: string,
 * }} FiatToCryptoOrder
 *
 * Field notes:
 * - `fiatAmount` / fee fields as **strings** preserve decimal precision; normalize to minor units
 *   at persistence boundaries if required.
 * - `walletAddress` is the customer destination for `targetAssetCode` (plus optional `network`).
 * - Audit: `createdAt` / `updatedAt` ISO 8601; optional milestone timestamps mirror status history.
 * - `failureCode` / `failureMessage` should be set when entering `failed` for supportability.
 * - **Transfer tracking (FCX-21):** `transferTxHash` is the broadcast id (e.g. txid); `transferCanonicalNetwork`
 *   matches `CRYPTO_TRANSFER_NETWORK_ID` values; `transferTxBroadcastAt` / `transferTxConfirmedAt` are ISO timestamps.
 * - **User progress (FCX-20):** `deliveredAssetAmount` / `deliveredAssetCode` populate the completed-state summary alongside `transferTxHash`.
 * - **Pricing (FCX-22):** `grossFiatAmount`, `feeFiatAmount`, `netFiatAmount`, `netCryptoAmount`,
 *   `exchangeRateApplied`, and `commissionConfigSnapshot` persist the authoritative quote. These are
 *   populated at intake when an exchange rate is supplied and refreshed when the admin approves the
 *   order with a locked rate. `pricingWarnings` surfaces machine-readable flags (e.g. `net_crypto_below_dust_threshold`).
 * - **Purchase execution (FCX-24):** `executionProviderId`, `executionProviderOrderId`, `executionFillPrice`,
 *   `executionFillQuantity`, `executionFilledAssetCode`, `executionExecutedAt`, and `executionAttempts`
 *   record the liquidity-provider fill metadata after `purchasing` → `transferring`. `executionLastErrorCode`
 *   is populated on `purchasing` → `failed` (or when a retry cycle was spent).
 * - **Deposit reconciliation (FCX-23):** `depositId`, `depositAmount`, `depositCurrency`, `depositReference`,
 *   and `depositReceivedAt` capture the bank / PSP payment that funded the order. `reconciledAt`,
 *   `reconciliationOutcome` (one of `DEPOSIT_RECONCILIATION_OUTCOME`), `reconciliationVariance` (signed
 *   minor-unit delta as decimal string), and `reconciliationNotes` hold the ops reviewer decision. A
 *   `matched` outcome is the only one that also transitions `submitted` → `paid`.
 */

const WALLET_ADDRESS_MIN_LEN = 8;
const WALLET_ADDRESS_MAX_LEN = 256;

/**
 * Keys required by `validateFiatToCryptoOrderDraft` for a new order payload (FCX-38).
 * `network` is optional; when omitted it is not validated beyond intake/transfer rules.
 *
 * @type {ReadonlyArray<'userId' | 'fiatCurrency' | 'fiatAmount' | 'targetAssetCode' | 'walletAddress'>}
 */
export const FIAT_TO_CRYPTO_ORDER_REQUIRED_DRAFT_FIELDS = Object.freeze([
    "userId",
    "fiatCurrency",
    "fiatAmount",
    "targetAssetCode",
    "walletAddress",
]);

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
