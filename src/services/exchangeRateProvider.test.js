import {
    EXCHANGE_RATE_ERROR_CODES,
    createExchangeRateProviderError,
    getExchangeRates,
    mapExchangeRatesPayload,
} from "@/services/exchangeRateProvider";

describe("exchangeRateProvider", () => {
    beforeEach(() => {
        global.fetch = jest.fn();
        jest.spyOn(console, "warn").mockImplementation(() => {});
        jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("getExchangeRates", () => {
        it("returns normalized payload for a valid provider response", async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    data: { rates: { EUR: "0.93", EGP: "48.1" } },
                }),
            });

            const result = await getExchangeRates("USD");

            expect(result.base).toBe("USD");
            expect(result.rates.EUR).toBe("0.93");
            expect(result.rates.EGP).toBe("48.1");
            expect(typeof result.fetchedAt).toBe("string");
            expect(() => new Date(result.fetchedAt).toISOString()).not.toThrow();
        });

        it("passes the abort signal to fetch", async () => {
            const controller = new AbortController();
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ data: { rates: { EUR: "0.93" } } }),
            });

            await getExchangeRates("USD", controller.signal);

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ signal: controller.signal }),
            );
        });

        it("encodes the base currency in the URL", async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ data: { rates: { EUR: "1" } } }),
            });

            await getExchangeRates("US D");

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("currency=US%20D"),
                expect.anything(),
            );
        });

        it("throws HTTP error when provider returns non-ok response", async () => {
            global.fetch.mockResolvedValue({ ok: false, status: 503 });

            await expect(getExchangeRates("USD")).rejects.toMatchObject({
                name: "ExchangeRateProviderError",
                code: EXCHANGE_RATE_ERROR_CODES.HTTP,
            });
        });

        it("throws PARSE error when response body is not valid JSON", async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => { throw new SyntaxError("Unexpected token"); },
            });

            await expect(getExchangeRates("USD")).rejects.toMatchObject({
                name: "ExchangeRateProviderError",
                code: EXCHANGE_RATE_ERROR_CODES.PARSE,
            });
        });

        it("throws NETWORK error on fetch failure", async () => {
            global.fetch.mockRejectedValue(new TypeError("Failed to fetch"));

            await expect(getExchangeRates("USD")).rejects.toMatchObject({
                name: "ExchangeRateProviderError",
                code: EXCHANGE_RATE_ERROR_CODES.NETWORK,
            });
        });

        it("re-throws AbortError without wrapping it", async () => {
            const abortError = new DOMException("The operation was aborted.", "AbortError");
            global.fetch.mockRejectedValue(abortError);

            await expect(getExchangeRates("USD")).rejects.toThrow(abortError);
        });
    });

    describe("mapExchangeRatesPayload", () => {
        it("returns normalized shape when rates are present", () => {
            const result = mapExchangeRatesPayload(
                { data: { rates: { GBP: "0.79" } } },
                "USD",
            );

            expect(result.base).toBe("USD");
            expect(result.rates).toEqual({ GBP: "0.79" });
            expect(typeof result.fetchedAt).toBe("string");
        });

        it("throws INVALID_PAYLOAD when rates key is missing", () => {
            expect(() => mapExchangeRatesPayload({ data: {} }, "USD")).toThrow(
                "Exchange rate payload is invalid.",
            );

            try {
                mapExchangeRatesPayload({ data: {} }, "USD");
            } catch (error) {
                expect(error.code).toBe(EXCHANGE_RATE_ERROR_CODES.INVALID_PAYLOAD);
            }
        });

        it("throws INVALID_PAYLOAD when payload is null", () => {
            expect(() => mapExchangeRatesPayload(null, "USD")).toThrow();
        });

        it("throws INVALID_PAYLOAD when rates is not an object", () => {
            expect(() => mapExchangeRatesPayload({ data: { rates: "bad" } }, "USD")).toThrow();
        });
    });

    describe("createExchangeRateProviderError", () => {
        it("creates an error with the expected properties", () => {
            const error = createExchangeRateProviderError(
                EXCHANGE_RATE_ERROR_CODES.HTTP,
                "Something went wrong",
                { status: 500 },
            );

            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe("ExchangeRateProviderError");
            expect(error.code).toBe(EXCHANGE_RATE_ERROR_CODES.HTTP);
            expect(error.message).toBe("Something went wrong");
            expect(error.details).toEqual({ status: 500 });
        });
    });
});
