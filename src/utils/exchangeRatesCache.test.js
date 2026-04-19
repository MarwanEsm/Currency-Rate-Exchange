import {
    clearExchangeRatesCache,
    EXCHANGE_RATES_CACHE_TTL_MS,
    invalidateExchangeRatesCache,
    readExchangeRatesCache,
    writeExchangeRatesCache,
} from "./exchangeRatesCache";

describe("exchangeRatesCache", () => {
    beforeEach(() => {
        clearExchangeRatesCache();
    });

    it("returns null for unknown base", () => {
        expect(readExchangeRatesCache("USD")).toBeNull();
    });

    it("returns a fresh entry and drops it after TTL", () => {
        jest.useFakeTimers();
        try {
            jest.setSystemTime(new Date("2026-01-01T00:00:00.000Z").getTime());

            const payload = { base: "USD", fetchedAt: "2026-01-01T00:00:00.000Z", rates: { EUR: "0.9" } };
            writeExchangeRatesCache("USD", payload);

            expect(readExchangeRatesCache("USD")).toEqual(payload);

            jest.setSystemTime(new Date("2026-01-01T00:06:00.001Z").getTime());
            expect(readExchangeRatesCache("USD")).toBeNull();
        } finally {
            jest.useRealTimers();
        }
    });

    it("invalidateExchangeRatesCache removes one base", () => {
        writeExchangeRatesCache("USD", { base: "USD", fetchedAt: "2026-01-01T00:00:00.000Z", rates: { EUR: "1" } });
        writeExchangeRatesCache("GBP", { base: "GBP", fetchedAt: "2026-01-01T00:00:00.000Z", rates: { EUR: "1" } });

        invalidateExchangeRatesCache("USD");

        expect(readExchangeRatesCache("USD")).toBeNull();
        expect(readExchangeRatesCache("GBP")).not.toBeNull();
    });
});
