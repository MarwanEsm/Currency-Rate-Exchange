/**
 * Exchange rate provider client (FCX-29).
 *
 * Reusable client for fetching live fiat-to-crypto exchange rates. The default integration points at
 * Coinbase (`/v2/exchange-rates`), but the shape is transport-agnostic — a different provider can be
 * wired in by swapping `baseUrl`, response mapper, and headers.
 *
 * Usage
 * -----
 * Module-level helpers (backwards compatible — used by hooks/components):
 *
 *     import { getExchangeRates, getRate } from "@/services/exchangeRateProvider";
 *     const normalized = await getExchangeRates("USD", abortSignal);
 *     const { rate } = await getRate("USD", "EUR");
 *
 * Factory for custom configuration (timeouts, retries, telemetry, alternate provider):
 *
 *     import { createExchangeRateClient } from "@/services/exchangeRateProvider";
 *     const client = createExchangeRateClient({
 *         baseUrl: "https://api.example.com/v1/rates",
 *         timeoutMs: 5_000,
 *         retries: 2,
 *         headers: { "X-API-Key": process.env.PROVIDER_KEY },
 *         logger: {
 *             onRequest: (ctx) => metrics.increment("rate_fetch.request", ctx),
 *             onSuccess: (ctx) => metrics.increment("rate_fetch.success", ctx),
 *             onError:   (ctx) => metrics.increment("rate_fetch.error", { code: ctx.error.code }),
 *             onRetry:   (ctx) => metrics.increment("rate_fetch.retry", ctx),
 *         },
 *     });
 *
 * Error taxonomy
 * --------------
 * All non-cancellation failures reject with an `ExchangeRateProviderError` whose `code` is one of
 * `EXCHANGE_RATE_ERROR_CODES`:
 *
 * | Code              | When                                                            | Retried? |
 * |-------------------|-----------------------------------------------------------------|----------|
 * | `network_error`   | DNS / connection failure, or request timed out                  | Yes      |
 * | `http_error`      | Non-2xx response from the provider                              | No       |
 * | `parse_error`     | Response body wasn't JSON                                       | No       |
 * | `invalid_payload` | Response JSON missing the expected rates shape                  | No       |
 *
 * Caller-triggered `AbortError` (from the `signal` passed in) is re-thrown as-is so hooks can
 * distinguish cancellation from failure.
 */

const DEFAULT_BASE_URL = "https://api.coinbase.com/v2/exchange-rates";
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRIES = 0;
const DEFAULT_RETRY_BACKOFF_MS = 250;
const DEFAULT_PROVIDER_ID = "coinbase";

export const EXCHANGE_RATE_ERROR_CODES = Object.freeze({
    NETWORK: "network_error",
    HTTP: "http_error",
    PARSE: "parse_error",
    INVALID_PAYLOAD: "invalid_payload_error",
});

/**
 * Default telemetry sink — logs warnings/errors to the console. Production integrations should
 * inject a structured logger (Datadog, Sentry, OTEL bridge, etc.).
 *
 * @type {ExchangeRateLogger}
 */
export const consoleExchangeRateLogger = Object.freeze({
    onRequest: () => {},
    onSuccess: () => {},
    onError: ({ error, providerId, baseCurrencyCode }) => {
        // eslint-disable-next-line no-console
        console.error(error?.message ?? "Exchange rate request failed.", {
            source: "exchangeRateProvider",
            providerId,
            baseCurrencyCode,
            code: error?.code,
            details: error?.details,
        });
    },
    onRetry: ({ providerId, baseCurrencyCode, attempt, nextDelayMs }) => {
        // eslint-disable-next-line no-console
        console.warn("Retrying exchange rate request.", {
            source: "exchangeRateProvider",
            providerId,
            baseCurrencyCode,
            attempt,
            nextDelayMs,
        });
    },
});

/**
 * @typedef {{
 *   onRequest?: (ctx: { providerId: string, baseCurrencyCode: string, url: string, attempt: number }) => void,
 *   onSuccess?: (ctx: { providerId: string, baseCurrencyCode: string, attempt: number, fetchedAt: string, rateCount: number, durationMs: number }) => void,
 *   onError?:   (ctx: { providerId: string, baseCurrencyCode: string, error: Error & { code?: string, details?: Record<string, unknown> }, attempt: number, durationMs: number }) => void,
 *   onRetry?:   (ctx: { providerId: string, baseCurrencyCode: string, attempt: number, nextDelayMs: number }) => void,
 * }} ExchangeRateLogger
 */

/**
 * @typedef {{
 *   baseUrl?: string,
 *   timeoutMs?: number,
 *   retries?: number,
 *   retryBackoffMs?: number,
 *   fetchImpl?: typeof fetch,
 *   logger?: ExchangeRateLogger,
 *   headers?: Record<string, string>,
 *   providerId?: string,
 * }} ExchangeRateClientConfig
 */

/**
 * Creates a typed provider error consumed by hooks/components.
 *
 * @param {string} code   One of EXCHANGE_RATE_ERROR_CODES.
 * @param {string} message  Human-readable description.
 * @param {Record<string, unknown>} [details]  Extra context for logging.
 * @returns {Error & { code: string, details: Record<string, unknown> }}
 */
export const createExchangeRateProviderError = (code, message, details = {}) => {
    const error = new Error(message);
    error.name = "ExchangeRateProviderError";
    error.code = code;
    error.details = details;
    return error;
};

const isProviderError = (error) => error?.name === "ExchangeRateProviderError";
const isAbortError = (error) => error?.name === "AbortError";

const sleep = (ms) =>
    new Promise((resolve) => {
        if (ms <= 0) resolve();
        else setTimeout(resolve, ms);
    });

/**
 * Maps the raw provider payload to the normalized shape used by the app.
 * Throws `INVALID_PAYLOAD` if the expected structure is missing.
 *
 * @param {unknown} payload
 * @param {string} baseCurrencyCode
 */
export const mapExchangeRatesPayload = (payload, baseCurrencyCode) => {
    const rates = payload && typeof payload === "object" ? payload?.data?.rates : undefined;
    if (!rates || typeof rates !== "object" || Array.isArray(rates)) {
        throw createExchangeRateProviderError(
            EXCHANGE_RATE_ERROR_CODES.INVALID_PAYLOAD,
            "Exchange rate payload is invalid.",
            { baseCurrencyCode },
        );
    }
    return {
        base: baseCurrencyCode,
        fetchedAt: new Date().toISOString(),
        rates,
    };
};

/**
 * Resolves a fetch implementation at call time so tests that assign `global.fetch = jest.fn()`
 * after module import still see the stub. Accepts an explicit override for custom transports.
 */
const resolveFetch = (override) => {
    if (typeof override === "function") return override;
    if (typeof globalThis.fetch === "function") return (...args) => globalThis.fetch(...args);
    throw new Error(
        "No fetch implementation available. Pass `fetchImpl` when creating an exchange rate client.",
    );
};

/**
 * Compose two AbortSignals: abort when either fires. Returns the signal to pass to fetch and a
 * cleanup function to detach the listener.
 *
 * @param {AbortSignal | undefined} callerSignal
 * @param {AbortSignal | undefined} internalSignal
 */
const composeSignals = (callerSignal, internalSignal) => {
    if (!callerSignal) return { signal: internalSignal, cleanup: () => {} };
    if (!internalSignal) return { signal: callerSignal, cleanup: () => {} };
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    if (callerSignal.aborted || internalSignal.aborted) controller.abort();
    else {
        callerSignal.addEventListener("abort", onAbort);
        internalSignal.addEventListener("abort", onAbort);
    }
    return {
        signal: controller.signal,
        cleanup: () => {
            callerSignal.removeEventListener("abort", onAbort);
            internalSignal.removeEventListener("abort", onAbort);
        },
    };
};

/**
 * Builds a reusable exchange rate client. The client is cheap to create — prefer one per transport
 * configuration (e.g. one production client + one mock for tests).
 *
 * @param {ExchangeRateClientConfig} [config]
 */
export const createExchangeRateClient = (config = {}) => {
    const {
        baseUrl = DEFAULT_BASE_URL,
        timeoutMs = DEFAULT_TIMEOUT_MS,
        retries = DEFAULT_RETRIES,
        retryBackoffMs = DEFAULT_RETRY_BACKOFF_MS,
        fetchImpl,
        logger = consoleExchangeRateLogger,
        headers = {},
        providerId = DEFAULT_PROVIDER_ID,
    } = config;

    const buildUrl = (baseCurrencyCode) =>
        `${baseUrl}?currency=${encodeURIComponent(baseCurrencyCode)}`;

    const doFetchOnce = async (baseCurrencyCode, callerSignal, attempt) => {
        const fetchFn = resolveFetch(fetchImpl);
        const url = buildUrl(baseCurrencyCode);
        const started = Date.now();

        logger.onRequest?.({ providerId, baseCurrencyCode, url, attempt });

        const timeoutController = timeoutMs > 0 ? new AbortController() : undefined;
        const timeoutHandle =
            timeoutController && typeof setTimeout === "function"
                ? setTimeout(() => timeoutController.abort(), timeoutMs)
                : undefined;
        const { signal, cleanup } = composeSignals(callerSignal, timeoutController?.signal);

        try {
            const response = await fetchFn(url, { signal, headers });

            if (!response.ok) {
                throw createExchangeRateProviderError(
                    EXCHANGE_RATE_ERROR_CODES.HTTP,
                    `Exchange rate request failed with status ${response.status}.`,
                    { providerId, baseCurrencyCode, status: response.status },
                );
            }

            let payload;
            try {
                payload = await response.json();
            } catch {
                throw createExchangeRateProviderError(
                    EXCHANGE_RATE_ERROR_CODES.PARSE,
                    "Exchange rate response parsing failed.",
                    { providerId, baseCurrencyCode },
                );
            }

            const mapped = mapExchangeRatesPayload(payload, baseCurrencyCode);
            logger.onSuccess?.({
                providerId,
                baseCurrencyCode,
                attempt,
                fetchedAt: mapped.fetchedAt,
                rateCount: Object.keys(mapped.rates).length,
                durationMs: Date.now() - started,
            });
            return mapped;
        } catch (error) {
            // Distinguish caller cancellation from our own timeout-driven abort.
            const ourTimeoutFired = timeoutController?.signal?.aborted === true && !callerSignal?.aborted;
            if (isAbortError(error) && !ourTimeoutFired) {
                // Caller-initiated cancel — surface as-is so hooks can ignore it.
                throw error;
            }
            if (isProviderError(error)) throw error;

            throw createExchangeRateProviderError(
                EXCHANGE_RATE_ERROR_CODES.NETWORK,
                ourTimeoutFired
                    ? "Exchange rate provider request timed out."
                    : "Exchange rate provider network request failed.",
                {
                    providerId,
                    baseCurrencyCode,
                    timedOut: Boolean(ourTimeoutFired),
                    originalMessage: error?.message,
                },
            );
        } finally {
            if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
            cleanup();
        }
    };

    /**
     * Fetch the full rate sheet for a base currency.
     *
     * @param {string} baseCurrencyCode
     * @param {AbortSignal} [signal]
     */
    const getExchangeRates = async (baseCurrencyCode, signal) => {
        let attempt = 0;
        let lastError;
        while (attempt <= retries) {
            const started = Date.now();
            try {
                return await doFetchOnce(baseCurrencyCode, signal, attempt);
            } catch (error) {
                lastError = error;
                // Caller-cancelled: never retry.
                if (isAbortError(error) && !isProviderError(error)) throw error;
                logger.onError?.({
                    providerId,
                    baseCurrencyCode,
                    error,
                    attempt,
                    durationMs: Date.now() - started,
                });

                const retryable =
                    isProviderError(error) && error.code === EXCHANGE_RATE_ERROR_CODES.NETWORK;
                if (!retryable || attempt >= retries) throw error;

                const nextDelayMs = retryBackoffMs * 2 ** attempt;
                logger.onRetry?.({ providerId, baseCurrencyCode, attempt, nextDelayMs });
                await sleep(nextDelayMs);
                attempt += 1;
            }
        }
        throw lastError;
    };

    /**
     * Convenience: fetch a single pair. Throws `INVALID_PAYLOAD` if the provider didn't include
     * that quote currency in the rate sheet.
     *
     * @param {string} baseCurrencyCode
     * @param {string} quoteCurrencyCode
     * @param {AbortSignal} [signal]
     */
    const getRate = async (baseCurrencyCode, quoteCurrencyCode, signal) => {
        const snapshot = await getExchangeRates(baseCurrencyCode, signal);
        const canonicalQuote =
            typeof quoteCurrencyCode === "string" ? quoteCurrencyCode.toUpperCase() : quoteCurrencyCode;
        const rate = snapshot.rates?.[canonicalQuote] ?? snapshot.rates?.[quoteCurrencyCode];
        if (typeof rate !== "string" && typeof rate !== "number") {
            throw createExchangeRateProviderError(
                EXCHANGE_RATE_ERROR_CODES.INVALID_PAYLOAD,
                `Exchange rate provider did not return a rate for ${baseCurrencyCode} → ${quoteCurrencyCode}.`,
                { providerId, baseCurrencyCode, quoteCurrencyCode },
            );
        }
        return {
            base: snapshot.base,
            quote: quoteCurrencyCode,
            rate: String(rate),
            fetchedAt: snapshot.fetchedAt,
        };
    };

    return {
        getExchangeRates,
        getRate,
        config: Object.freeze({ baseUrl, timeoutMs, retries, retryBackoffMs, providerId }),
    };
};

/**
 * Default module-level client preserves the original behavior (no retries, console logger). Hooks
 * and components import from here so existing call sites continue to work unchanged.
 */
const defaultClient = createExchangeRateClient();

/**
 * Fetches live exchange rates for a given base currency using the default client.
 *
 * @param {string} baseCurrencyCode  ISO 4217 currency code (e.g. "USD").
 * @param {AbortSignal} [signal]     Optional abort signal for cancellation.
 */
export const getExchangeRates = (baseCurrencyCode, signal) =>
    defaultClient.getExchangeRates(baseCurrencyCode, signal);

/**
 * Fetches a single base → quote rate using the default client.
 *
 * @param {string} baseCurrencyCode
 * @param {string} quoteCurrencyCode
 * @param {AbortSignal} [signal]
 */
export const getRate = (baseCurrencyCode, quoteCurrencyCode, signal) =>
    defaultClient.getRate(baseCurrencyCode, quoteCurrencyCode, signal);
