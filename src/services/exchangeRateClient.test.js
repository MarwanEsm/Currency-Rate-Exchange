import {
    EXCHANGE_RATE_ERROR_CODES,
    createExchangeRateClient,
    createExchangeRateProviderError,
} from "@/services/exchangeRateProvider";

const okRatesResponse = (rates = { EUR: "0.93", EGP: "48.1" }) => ({
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue({ data: { rates } }),
});

const silentLogger = () => ({
    onRequest: jest.fn(),
    onSuccess: jest.fn(),
    onError: jest.fn(),
    onRetry: jest.fn(),
});

describe("createExchangeRateClient", () => {
    beforeEach(() => {
        jest.useRealTimers();
    });

    test("uses the injected fetchImpl, baseUrl, and headers", async () => {
        const fetchImpl = jest.fn().mockResolvedValue(okRatesResponse());
        const client = createExchangeRateClient({
            fetchImpl,
            baseUrl: "https://example.test/v1/rates",
            headers: { "X-API-Key": "secret" },
            providerId: "custom_provider",
            logger: silentLogger(),
        });

        const snapshot = await client.getExchangeRates("USD");

        expect(fetchImpl).toHaveBeenCalledTimes(1);
        const [url, init] = fetchImpl.mock.calls[0];
        expect(url).toBe("https://example.test/v1/rates?currency=USD");
        expect(init.headers).toEqual({ "X-API-Key": "secret" });
        expect(snapshot.base).toBe("USD");
        expect(snapshot.rates.EUR).toBe("0.93");
        expect(client.config.providerId).toBe("custom_provider");
    });

    test("invokes logger.onRequest and onSuccess for a healthy response", async () => {
        const fetchImpl = jest.fn().mockResolvedValue(okRatesResponse());
        const logger = silentLogger();
        const client = createExchangeRateClient({ fetchImpl, logger });

        await client.getExchangeRates("USD");

        expect(logger.onRequest).toHaveBeenCalledWith(
            expect.objectContaining({ providerId: "coinbase", baseCurrencyCode: "USD", attempt: 0 }),
        );
        expect(logger.onSuccess).toHaveBeenCalledWith(
            expect.objectContaining({
                providerId: "coinbase",
                baseCurrencyCode: "USD",
                attempt: 0,
                rateCount: 2,
            }),
        );
        expect(logger.onError).not.toHaveBeenCalled();
        expect(logger.onRetry).not.toHaveBeenCalled();
    });

    test("retries network failures up to the configured limit, then surfaces NETWORK error", async () => {
        const fetchImpl = jest
            .fn()
            .mockRejectedValueOnce(new TypeError("Failed to fetch"))
            .mockRejectedValueOnce(new TypeError("Failed to fetch"))
            .mockRejectedValueOnce(new TypeError("Failed to fetch"));
        const logger = silentLogger();
        const client = createExchangeRateClient({
            fetchImpl,
            retries: 2,
            retryBackoffMs: 0,
            logger,
        });

        await expect(client.getExchangeRates("USD")).rejects.toMatchObject({
            name: "ExchangeRateProviderError",
            code: EXCHANGE_RATE_ERROR_CODES.NETWORK,
        });

        expect(fetchImpl).toHaveBeenCalledTimes(3);
        expect(logger.onError).toHaveBeenCalledTimes(3);
        expect(logger.onRetry).toHaveBeenCalledTimes(2);
        expect(logger.onRetry).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ attempt: 0, nextDelayMs: 0 }),
        );
    });

    test("recovers on a subsequent attempt when a transient network failure resolves", async () => {
        const fetchImpl = jest
            .fn()
            .mockRejectedValueOnce(new TypeError("Failed to fetch"))
            .mockResolvedValueOnce(okRatesResponse({ EUR: "0.90" }));
        const client = createExchangeRateClient({
            fetchImpl,
            retries: 2,
            retryBackoffMs: 0,
            logger: silentLogger(),
        });

        const snapshot = await client.getExchangeRates("USD");

        expect(snapshot.rates.EUR).toBe("0.90");
        expect(fetchImpl).toHaveBeenCalledTimes(2);
    });

    test("does NOT retry HTTP errors (5xx/4xx)", async () => {
        const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 503 });
        const logger = silentLogger();
        const client = createExchangeRateClient({
            fetchImpl,
            retries: 3,
            retryBackoffMs: 0,
            logger,
        });

        await expect(client.getExchangeRates("USD")).rejects.toMatchObject({
            code: EXCHANGE_RATE_ERROR_CODES.HTTP,
        });
        expect(fetchImpl).toHaveBeenCalledTimes(1);
        expect(logger.onRetry).not.toHaveBeenCalled();
    });

    test("does NOT retry PARSE errors", async () => {
        const fetchImpl = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => {
                throw new SyntaxError("Unexpected token");
            },
        });
        const client = createExchangeRateClient({
            fetchImpl,
            retries: 3,
            retryBackoffMs: 0,
            logger: silentLogger(),
        });

        await expect(client.getExchangeRates("USD")).rejects.toMatchObject({
            code: EXCHANGE_RATE_ERROR_CODES.PARSE,
        });
        expect(fetchImpl).toHaveBeenCalledTimes(1);
    });

    test("does NOT retry INVALID_PAYLOAD", async () => {
        const fetchImpl = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ data: {} }),
        });
        const client = createExchangeRateClient({
            fetchImpl,
            retries: 3,
            retryBackoffMs: 0,
            logger: silentLogger(),
        });

        await expect(client.getExchangeRates("USD")).rejects.toMatchObject({
            code: EXCHANGE_RATE_ERROR_CODES.INVALID_PAYLOAD,
        });
        expect(fetchImpl).toHaveBeenCalledTimes(1);
    });

    test("surface timeout as NETWORK error with timedOut=true", async () => {
        const fetchImpl = jest.fn().mockImplementation(
            (_url, { signal }) =>
                new Promise((_resolve, reject) => {
                    if (signal?.aborted) reject(new DOMException("aborted", "AbortError"));
                    signal?.addEventListener("abort", () =>
                        reject(new DOMException("aborted", "AbortError")),
                    );
                }),
        );
        const client = createExchangeRateClient({
            fetchImpl,
            timeoutMs: 5,
            retries: 0,
            retryBackoffMs: 0,
            logger: silentLogger(),
        });

        const promise = client.getExchangeRates("USD");

        await expect(promise).rejects.toMatchObject({
            code: EXCHANGE_RATE_ERROR_CODES.NETWORK,
            details: expect.objectContaining({ timedOut: true }),
        });
    });

    test("re-throws caller AbortError as-is without wrapping or retrying", async () => {
        const abortError = new DOMException("The operation was aborted.", "AbortError");
        const fetchImpl = jest.fn().mockRejectedValue(abortError);
        const controller = new AbortController();
        controller.abort();
        const logger = silentLogger();
        const client = createExchangeRateClient({
            fetchImpl,
            retries: 3,
            retryBackoffMs: 0,
            logger,
        });

        await expect(client.getExchangeRates("USD", controller.signal)).rejects.toBe(abortError);
        expect(fetchImpl).toHaveBeenCalledTimes(1);
        expect(logger.onRetry).not.toHaveBeenCalled();
    });

    test("preserves provider error thrown through logger.onError", async () => {
        const fetchImpl = jest.fn().mockRejectedValue(new TypeError("Failed to fetch"));
        const logger = silentLogger();
        const client = createExchangeRateClient({
            fetchImpl,
            retries: 0,
            retryBackoffMs: 0,
            logger,
        });

        await expect(client.getExchangeRates("USD")).rejects.toMatchObject({
            code: EXCHANGE_RATE_ERROR_CODES.NETWORK,
        });

        expect(logger.onError).toHaveBeenCalledWith(
            expect.objectContaining({
                providerId: "coinbase",
                baseCurrencyCode: "USD",
                attempt: 0,
                error: expect.objectContaining({
                    name: "ExchangeRateProviderError",
                    code: EXCHANGE_RATE_ERROR_CODES.NETWORK,
                }),
            }),
        );
    });

    describe("getRate", () => {
        test("returns a single base → quote rate (case-insensitive quote)", async () => {
            const fetchImpl = jest
                .fn()
                .mockResolvedValue(okRatesResponse({ EUR: "0.93", GBP: "0.79" }));
            const client = createExchangeRateClient({ fetchImpl, logger: silentLogger() });

            const result = await client.getRate("USD", "eur");

            expect(result).toMatchObject({ base: "USD", quote: "eur", rate: "0.93" });
            expect(typeof result.fetchedAt).toBe("string");
        });

        test("throws INVALID_PAYLOAD when the quote is not in the rate sheet", async () => {
            const fetchImpl = jest.fn().mockResolvedValue(okRatesResponse({ EUR: "0.93" }));
            const client = createExchangeRateClient({ fetchImpl, logger: silentLogger() });

            await expect(client.getRate("USD", "ZZZ")).rejects.toMatchObject({
                code: EXCHANGE_RATE_ERROR_CODES.INVALID_PAYLOAD,
            });
        });
    });

    test("createExchangeRateProviderError constructs a typed error", () => {
        const err = createExchangeRateProviderError(
            EXCHANGE_RATE_ERROR_CODES.HTTP,
            "boom",
            { status: 500 },
        );
        expect(err).toBeInstanceOf(Error);
        expect(err).toMatchObject({
            name: "ExchangeRateProviderError",
            code: "http_error",
            message: "boom",
            details: { status: 500 },
        });
    });
});
