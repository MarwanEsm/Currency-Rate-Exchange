/**
 * Exchange Rate Provider Client
 *
 * Single reusable service for fetching live exchange rates from Coinbase.
 *
 * Contract:
 *   getExchangeRates(baseCurrencyCode, signal?) → Promise<NormalizedRates>
 *
 *   NormalizedRates shape:
 *     { base: string, fetchedAt: string (ISO 8601), rates: Record<string, string> }
 *
 *   On failure the promise rejects with an ExchangeRateProviderError whose
 *   `.code` is one of EXCHANGE_RATE_ERROR_CODES (NETWORK | HTTP | PARSE | INVALID_PAYLOAD).
 *   AbortError is re-thrown as-is so callers can distinguish cancellation.
 */

const EXCHANGE_RATE_BASE_URL = "https://api.coinbase.com/v2/exchange-rates";

export const EXCHANGE_RATE_ERROR_CODES = {
    NETWORK: "network_error",
    HTTP: "http_error",
    PARSE: "parse_error",
    INVALID_PAYLOAD: "invalid_payload_error",
};

/**
 * Creates a typed provider error object consumed by hooks/components.
 *
 * @param {string} code   One of EXCHANGE_RATE_ERROR_CODES.
 * @param {string} message  Human-readable description.
 * @param {Record<string, unknown>} [details]  Extra context for logging.
 * @returns {Error & { code: string, details?: Record<string, unknown> }}
 */
export const createExchangeRateProviderError = (code, message, details = {}) => {
    const error = new Error(message);
    error.name = "ExchangeRateProviderError";
    error.code = code;
    error.details = details;
    return error;
};

const logProviderEvent = (level, message, context = {}) => {
    const payload = {
        source: "exchangeRateProvider",
        ...context,
    };

    if (level === "warn") {
        console.warn(message, payload);
        return;
    }

    console.error(message, payload);
};

/**
 * Maps the raw provider payload to the normalized shape used by the app.
 * Throws INVALID_PAYLOAD if the expected structure is missing.
 */
export const mapExchangeRatesPayload = (payload, baseCurrencyCode) => {
    const rates = payload?.data?.rates;
    if (!rates || typeof rates !== "object") {
        logProviderEvent("warn", "Provider payload is missing rates", { baseCurrencyCode });
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
 * Fetches live exchange rates for a given base currency.
 *
 * @param {string} baseCurrencyCode  ISO 4217 currency code (e.g. "USD").
 * @param {AbortSignal} [signal]     Optional abort signal for cancellation.
 * @returns {Promise<{ base: string, fetchedAt: string, rates: Record<string, string> }>}
 */
export const getExchangeRates = async (baseCurrencyCode, signal) => {
    try {
        const response = await fetch(
            `${EXCHANGE_RATE_BASE_URL}?currency=${encodeURIComponent(baseCurrencyCode)}`,
            { signal },
        );

        if (!response.ok) {
            const error = createExchangeRateProviderError(
                EXCHANGE_RATE_ERROR_CODES.HTTP,
                `Exchange rate request failed with status ${response.status}.`,
                { baseCurrencyCode, status: response.status },
            );
            logProviderEvent("error", "Provider request returned non-ok status", error.details);
            throw error;
        }

        let payload;
        try {
            payload = await response.json();
        } catch {
            const error = createExchangeRateProviderError(
                EXCHANGE_RATE_ERROR_CODES.PARSE,
                "Exchange rate response parsing failed.",
                { baseCurrencyCode },
            );
            logProviderEvent("error", "Provider response JSON parsing failed", error.details);
            throw error;
        }

        return mapExchangeRatesPayload(payload, baseCurrencyCode);
    } catch (error) {
        if (error?.name === "AbortError") throw error;
        if (error?.name === "ExchangeRateProviderError") throw error;

        const providerError = createExchangeRateProviderError(
            EXCHANGE_RATE_ERROR_CODES.NETWORK,
            "Exchange rate provider network request failed.",
            { baseCurrencyCode },
        );
        logProviderEvent("error", "Provider network request failed", {
            ...providerError.details,
            originalMessage: error?.message,
        });
        throw providerError;
    }
};
