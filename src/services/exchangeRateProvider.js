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
 * @param {string} code
 * @param {string} message
 * @param {Record<string, unknown>} [details]
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
        } catch (parseError) {
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
 * @param {string} code
 * @param {string} message
 * @param {Record<string, unknown>} [details]
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
        } catch (parseError) {
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
