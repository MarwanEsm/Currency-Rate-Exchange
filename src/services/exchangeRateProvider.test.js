import {
    EXCHANGE_RATE_ERROR_CODES,
    getExchangeRates,
    mapExchangeRatesPayload,
} from "@/services/exchangeRateProvider";

describe("exchangeRateProvider", () => {
    beforeEach(() => {
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    it("returns normalized payload for valid provider response", async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                data: {
                    rates: {
                        EUR: "0.93",
                    },
                },
            }),
        });

        const result = await getExchangeRates("USD");

        expect(result.base).toBe("USD");
        expect(result.rates.EUR).toBe("0.93");
        expect(typeof result.fetchedAt).toBe("string");
    });

    it("throws a typed invalid payload error when rates are missing", () => {
        expect(() => mapExchangeRatesPayload({ data: {} }, "USD")).toThrow("Exchange rate payload is invalid.");
        try {
            mapExchangeRatesPayload({ data: {} }, "USD");
        } catch (error) {
            expect(error.code).toBe(EXCHANGE_RATE_ERROR_CODES.INVALID_PAYLOAD);
        }
    });

    it("throws a typed http error when provider returns non-ok response", async () => {
        global.fetch.mockResolvedValue({
            ok: false,
            status: 503,
        });

        await expect(getExchangeRates("USD")).rejects.toMatchObject({
            code: EXCHANGE_RATE_ERROR_CODES.HTTP,
        });
    });
});
