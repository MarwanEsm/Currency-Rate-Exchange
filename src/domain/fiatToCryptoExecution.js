/**
 * Crypto purchase execution from liquidity providers (FCX-24).
 *
 * Given an order already in `purchasing` (after admin approval locks a quote), this module calls
 * a registered liquidity provider, retries transient failures, records fill metadata, appends an
 * append-only audit trail, and produces a patch that moves the order to `transferring` on success
 * or `failed` when retries are exhausted / the error is non-retryable.
 *
 * Providers are injected via `registerLiquidityProvider` so tests and production wiring stay out
 * of the pure domain layer. A deterministic-by-default internal simulator is registered for demo
 * flows and for CI tests that don't want to depend on an external integration.
 */

import { FIAT_TO_CRYPTO_ORDER_STATUS } from "./fiatToCryptoOrder";

export const LIQUIDITY_PROVIDER_ID = {
    INTERNAL_SIMULATOR: "internal_simulator",
};

export const PURCHASE_EXECUTION_ERROR_CODES = {
    ORDER_NOT_ELIGIBLE: "order_not_eligible",
    MISSING_PRICING: "missing_pricing",
    NO_PROVIDER_CONFIGURED: "no_provider_configured",
    PROVIDER_TIMEOUT: "provider_timeout",
    PROVIDER_NETWORK_ERROR: "provider_network_error",
    INSUFFICIENT_LIQUIDITY: "insufficient_liquidity",
    RATE_REJECTED: "rate_rejected",
    INTERNAL_ERROR: "internal_error",
    MAX_RETRIES_EXCEEDED: "max_retries_exceeded",
};

/**
 * Transient error codes that justify a retry. Anything else is treated as permanent even if the
 * provider sets `isRetryable: true` (defensive: the domain owns the retry classification).
 */
const RETRYABLE_ERROR_CODES = new Set([
    PURCHASE_EXECUTION_ERROR_CODES.PROVIDER_TIMEOUT,
    PURCHASE_EXECUTION_ERROR_CODES.PROVIDER_NETWORK_ERROR,
    PURCHASE_EXECUTION_ERROR_CODES.INSUFFICIENT_LIQUIDITY,
]);

export const DEFAULT_MAX_PURCHASE_ATTEMPTS = 3;

/**
 * @typedef {{
 *   order: import("./fiatToCryptoOrder.js").FiatToCryptoOrder,
 *   now: string,
 *   uuid: string,
 *   simulatedOutcome?: string,
 * }} LiquidityProviderRequest
 *
 * @typedef {{
 *   ok: true,
 *   providerId: string,
 *   providerOrderId: string,
 *   fillPrice: string,
 *   fillQuantity: string,
 *   filledAssetCode: string,
 *   executedAt: string,
 * } | {
 *   ok: false,
 *   providerId: string,
 *   errorCode: string,
 *   errorMessage: string,
 *   isRetryable?: boolean,
 * }} LiquidityProviderResult
 *
 * @typedef {(request: LiquidityProviderRequest) => Promise<LiquidityProviderResult> | LiquidityProviderResult} LiquidityProviderFn
 */

/** @type {Map<string, LiquidityProviderFn>} */
const providerRegistry = new Map();

/**
 * @param {string} id
 * @param {LiquidityProviderFn} executeFn
 */
export const registerLiquidityProvider = (id, executeFn) => {
    providerRegistry.set(id, executeFn);
};

/** @param {string} id */
export const getLiquidityProvider = (id) => providerRegistry.get(id);

export const getRegisteredLiquidityProviderIds = () => [...providerRegistry.keys()];

/** Tests-only: wipe custom registrations and re-register the internal simulator. */
export const resetLiquidityProvidersForTests = () => {
    providerRegistry.clear();
    registerLiquidityProvider(LIQUIDITY_PROVIDER_ID.INTERNAL_SIMULATOR, internalSimulatorExecute);
};

/**
 * Internal deterministic simulator. Drives all decisions off `request.simulatedOutcome` and
 * fields already present on the order (so no wall clock or RNG). Ideal for demos + tests.
 *
 * @type {LiquidityProviderFn}
 */
export const internalSimulatorExecute = (request) => {
    const outcome = request.simulatedOutcome;

    if (outcome === "timeout") {
        return {
            ok: false,
            providerId: LIQUIDITY_PROVIDER_ID.INTERNAL_SIMULATOR,
            errorCode: PURCHASE_EXECUTION_ERROR_CODES.PROVIDER_TIMEOUT,
            errorMessage: "Simulated provider timeout.",
            isRetryable: true,
        };
    }
    if (outcome === "insufficient_liquidity") {
        return {
            ok: false,
            providerId: LIQUIDITY_PROVIDER_ID.INTERNAL_SIMULATOR,
            errorCode: PURCHASE_EXECUTION_ERROR_CODES.INSUFFICIENT_LIQUIDITY,
            errorMessage: "Simulated insufficient liquidity at current rate.",
            isRetryable: true,
        };
    }
    if (outcome === "rate_rejected") {
        return {
            ok: false,
            providerId: LIQUIDITY_PROVIDER_ID.INTERNAL_SIMULATOR,
            errorCode: PURCHASE_EXECUTION_ERROR_CODES.RATE_REJECTED,
            errorMessage: "Simulated rate rejected by venue.",
            isRetryable: false,
        };
    }
    if (outcome === "network_error") {
        return {
            ok: false,
            providerId: LIQUIDITY_PROVIDER_ID.INTERNAL_SIMULATOR,
            errorCode: PURCHASE_EXECUTION_ERROR_CODES.PROVIDER_NETWORK_ERROR,
            errorMessage: "Simulated provider network error.",
            isRetryable: true,
        };
    }

    return {
        ok: true,
        providerId: LIQUIDITY_PROVIDER_ID.INTERNAL_SIMULATOR,
        providerOrderId: `sim-${request.uuid}`,
        fillPrice: request.order.exchangeRateApplied ?? "0",
        fillQuantity: request.order.netCryptoAmount ?? "0",
        filledAssetCode: request.order.netCryptoAssetCode ?? request.order.targetAssetCode,
        executedAt: request.now,
    };
};

registerLiquidityProvider(LIQUIDITY_PROVIDER_ID.INTERNAL_SIMULATOR, internalSimulatorExecute);

/**
 * @typedef {{
 *   schemaVersion: 1,
 *   occurredAt: string,
 *   orderId: string,
 *   providerId: string,
 *   attempt: number,
 *   outcome: 'success' | 'retry' | 'failed_permanent',
 *   actor?: string,
 *   fillPrice?: string,
 *   fillQuantity?: string,
 *   filledAssetCode?: string,
 *   providerOrderId?: string,
 *   errorCode?: string,
 *   errorMessage?: string,
 * }} PurchaseExecutionAuditEntry
 */

/** @type {PurchaseExecutionAuditEntry[]} */
const executionAuditBuffer = [];
const EXECUTION_AUDIT_BUFFER_MAX = 500;

/** @returns {ReadonlyArray<PurchaseExecutionAuditEntry>} */
export const getPurchaseExecutionAuditLogSnapshot = () => [...executionAuditBuffer];

/** Tests only. */
export const resetPurchaseExecutionAuditLogForTests = () => {
    executionAuditBuffer.length = 0;
};

const appendExecutionAudit = (entry) => {
    executionAuditBuffer.push(entry);
    if (executionAuditBuffer.length > EXECUTION_AUDIT_BUFFER_MAX) {
        executionAuditBuffer.splice(0, executionAuditBuffer.length - EXECUTION_AUDIT_BUFFER_MAX);
    }
};

/**
 * @typedef {{
 *   providerId?: string,
 *   maxAttempts?: number,
 *   simulatedOutcome?: string,
 *   actor?: string,
 *   clock?: () => string,
 *   uuidFactory?: () => string,
 * }} ExecutePurchaseOptions
 *
 * @typedef {{
 *   ok: true,
 *   providerId: string,
 *   providerOrderId: string,
 *   fillPrice: string,
 *   fillQuantity: string,
 *   filledAssetCode: string,
 *   executedAt: string,
 *   attempts: number,
 *   audit: ReadonlyArray<PurchaseExecutionAuditEntry>,
 * } | {
 *   ok: false,
 *   providerId: string,
 *   errorCode: string,
 *   errorMessage: string,
 *   attempts: number,
 *   audit: ReadonlyArray<PurchaseExecutionAuditEntry>,
 * }} ExecutePurchaseResult
 */

let uuidCounter = 0;
const defaultUuidFactory = () => {
    uuidCounter += 1;
    return `exec-${Date.now().toString(36)}-${uuidCounter.toString(36)}`;
};

/**
 * Executes a crypto purchase against the registered liquidity provider, retrying transient errors
 * up to `maxAttempts` (default 3). Emits an audit entry for every attempt and returns a fully
 * structured result for the caller to persist via `buildExecutionOrderPatch`.
 *
 * @param {import("./fiatToCryptoOrder.js").FiatToCryptoOrder | null | undefined} order
 * @param {ExecutePurchaseOptions} [options]
 * @returns {Promise<ExecutePurchaseResult>}
 */
export const executePurchaseWithRetry = async (order, options = {}) => {
    const providerId = options.providerId ?? LIQUIDITY_PROVIDER_ID.INTERNAL_SIMULATOR;
    const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_PURCHASE_ATTEMPTS;
    const clock = options.clock ?? (() => new Date().toISOString());
    const uuidFactory = options.uuidFactory ?? defaultUuidFactory;
    const actor = options.actor;

    const attempts = [];

    const guardFail = (errorCode, errorMessage) => {
        const entry = {
            schemaVersion: /** @type {const} */ (1),
            occurredAt: clock(),
            orderId: order?.id ?? "",
            providerId,
            attempt: 0,
            outcome: /** @type {const} */ ("failed_permanent"),
            errorCode,
            errorMessage,
            ...(actor ? { actor } : {}),
        };
        appendExecutionAudit(entry);
        attempts.push(entry);
        return {
            ok: /** @type {const} */ (false),
            providerId,
            errorCode,
            errorMessage,
            attempts: 0,
            audit: attempts,
        };
    };

    if (!order || order.status !== FIAT_TO_CRYPTO_ORDER_STATUS.PURCHASING) {
        return guardFail(
            PURCHASE_EXECUTION_ERROR_CODES.ORDER_NOT_ELIGIBLE,
            `Order must be in ${FIAT_TO_CRYPTO_ORDER_STATUS.PURCHASING} (got: ${order?.status ?? "none"}).`,
        );
    }
    if (!order.netCryptoAmount || !order.exchangeRateApplied) {
        return guardFail(
            PURCHASE_EXECUTION_ERROR_CODES.MISSING_PRICING,
            "Order has no locked quote; run pricing/approval first.",
        );
    }

    const providerFn = getLiquidityProvider(providerId);
    if (!providerFn) {
        return guardFail(
            PURCHASE_EXECUTION_ERROR_CODES.NO_PROVIDER_CONFIGURED,
            `No liquidity provider registered for id "${providerId}".`,
        );
    }

    let attempt = 0;
    while (attempt < maxAttempts) {
        attempt += 1;
        const request = {
            order,
            now: clock(),
            uuid: uuidFactory(),
            simulatedOutcome: options.simulatedOutcome,
        };

        /** @type {LiquidityProviderResult} */
        let result;
        try {
            result = await providerFn(request);
        } catch (err) {
            result = {
                ok: false,
                providerId,
                errorCode: PURCHASE_EXECUTION_ERROR_CODES.INTERNAL_ERROR,
                errorMessage: String(err?.message ?? err),
                isRetryable: false,
            };
        }

        if (result.ok) {
            const entry = {
                schemaVersion: /** @type {const} */ (1),
                occurredAt: clock(),
                orderId: order.id,
                providerId: result.providerId,
                attempt,
                outcome: /** @type {const} */ ("success"),
                fillPrice: result.fillPrice,
                fillQuantity: result.fillQuantity,
                filledAssetCode: result.filledAssetCode,
                providerOrderId: result.providerOrderId,
                ...(actor ? { actor } : {}),
            };
            appendExecutionAudit(entry);
            attempts.push(entry);
            return {
                ok: true,
                providerId: result.providerId,
                providerOrderId: result.providerOrderId,
                fillPrice: result.fillPrice,
                fillQuantity: result.fillQuantity,
                filledAssetCode: result.filledAssetCode,
                executedAt: result.executedAt,
                attempts: attempt,
                audit: attempts,
            };
        }

        const retryable =
            Boolean(result.isRetryable) && RETRYABLE_ERROR_CODES.has(result.errorCode);
        const isLast = attempt >= maxAttempts;
        const outcome = retryable && !isLast ? "retry" : "failed_permanent";

        const entry = {
            schemaVersion: /** @type {const} */ (1),
            occurredAt: clock(),
            orderId: order.id,
            providerId,
            attempt,
            outcome,
            errorCode: result.errorCode,
            errorMessage: result.errorMessage,
            ...(actor ? { actor } : {}),
        };
        appendExecutionAudit(entry);
        attempts.push(entry);

        if (outcome === "failed_permanent") {
            const finalErrorCode = isLast && retryable
                ? PURCHASE_EXECUTION_ERROR_CODES.MAX_RETRIES_EXCEEDED
                : result.errorCode;
            return {
                ok: false,
                providerId,
                errorCode: finalErrorCode,
                errorMessage: result.errorMessage,
                attempts: attempt,
                audit: attempts,
            };
        }
    }

    return {
        ok: false,
        providerId,
        errorCode: PURCHASE_EXECUTION_ERROR_CODES.MAX_RETRIES_EXCEEDED,
        errorMessage: `Exceeded maxAttempts=${maxAttempts}.`,
        attempts: maxAttempts,
        audit: attempts,
    };
};

/**
 * Produces the order patch to persist after an execution attempt. Success transitions the order
 * to `transferring` and records full fill metadata; failure transitions to `failed` with a
 * supportable failure code and the last error details.
 *
 * @param {import("./fiatToCryptoOrder.js").FiatToCryptoOrder} order
 * @param {ExecutePurchaseResult} result
 * @param {{ now?: string, actor?: string }} [options]
 * @returns {Partial<import("./fiatToCryptoOrder.js").FiatToCryptoOrder>}
 */
export const buildExecutionOrderPatch = (order, result, options = {}) => {
    const now = options.now ?? new Date().toISOString();
    const actor = options.actor;

    if (result.ok) {
        return {
            status: FIAT_TO_CRYPTO_ORDER_STATUS.TRANSFERRING,
            transferringAt: now,
            updatedAt: now,
            executionProviderId: result.providerId,
            executionProviderOrderId: result.providerOrderId,
            executionFillPrice: result.fillPrice,
            executionFillQuantity: result.fillQuantity,
            executionFilledAssetCode: result.filledAssetCode,
            executionExecutedAt: result.executedAt,
            executionAttempts: result.attempts,
            executionLastErrorCode: undefined,
            ...(actor ? { lastUpdatedBy: actor } : {}),
        };
    }

    return {
        status: FIAT_TO_CRYPTO_ORDER_STATUS.FAILED,
        failureCode: result.errorCode,
        failureMessage: result.errorMessage,
        failedAt: now,
        updatedAt: now,
        executionProviderId: result.providerId,
        executionAttempts: result.attempts,
        executionLastErrorCode: result.errorCode,
        ...(actor ? { lastUpdatedBy: actor } : {}),
    };
};
