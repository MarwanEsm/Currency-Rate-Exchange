/**
 * FCX-36: rate retrieval (hook + provider) wired to conversion helpers — documents
 * successful/failed fetch, missing quote, and invalid amount without UI flakiness (fully mocked).
 */
import { renderHook, waitFor } from "@testing-library/react";
import {
    createExchangeRateProviderError,
    EXCHANGE_RATE_ERROR_CODES,
    getExchangeRates,
} from "@/services/exchangeRateProvider";
import { clearExchangeRatesCache } from "@/utils/exchangeRatesCache";
import {
    convertAmountWithRate,
    parseDigitsAmount,
} from "@/utils/convertCurrencyAmount";
import useExchangeRates from "@/utils/useExchangeRates";

jest.mock("@/services/exchangeRateProvider", () => ({
    ...jest.requireActual("@/services/exchangeRateProvider"),
    getExchangeRates: jest.fn(),
}));

const usdPayload = {
    base: "USD",
    fetchedAt: "2026-04-26T12:00:00.000Z",
    rates: { EUR: "0.915", GBP: "0.79" },
};

describe("rate fetch and conversion (FCX-36)", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        clearExchangeRatesCache();
    });

    it("successful fetch: numericRate matches provider quote and converts amount", async () => {
        getExchangeRates.mockResolvedValue(usdPayload);

        const { result } = renderHook(() => useExchangeRates("USD", "EUR"));

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.providerError).toBeNull();
        expect(result.current.numericRate).toBeCloseTo(0.915);

        const amount = parseDigitsAmount("100");
        expect(convertAmountWithRate(amount, result.current.numericRate)).toBe(91.5);
    });

    it("failed fetch: providerError set, numericRate null, conversion cannot run", async () => {
        const err = createExchangeRateProviderError(
            EXCHANGE_RATE_ERROR_CODES.NETWORK,
            "unreachable",
        );
        getExchangeRates.mockRejectedValue(err);

        const { result } = renderHook(() => useExchangeRates("USD", "EUR"));

        await waitFor(() => expect(result.current.providerError).toBeTruthy());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.numericRate).toBeNull();
        expect(result.current.providerError?.code).toBe(EXCHANGE_RATE_ERROR_CODES.NETWORK);
        expect(convertAmountWithRate(parseDigitsAmount("10"), result.current.numericRate)).toBeNull();
    });

    it("missing quote: fetch succeeds but numericRate null for unknown target", async () => {
        getExchangeRates.mockResolvedValue(usdPayload);

        const { result } = renderHook(() => useExchangeRates("USD", "ZZZ"));

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.providerError).toBeNull();
        expect(result.current.numericRate).toBeNull();
        expect(convertAmountWithRate(parseDigitsAmount("10"), result.current.numericRate)).toBeNull();
    });

    it("invalid / empty amount: parse yields null and conversion yields null with a valid rate", async () => {
        getExchangeRates.mockResolvedValue(usdPayload);

        const { result } = renderHook(() => useExchangeRates("USD", "EUR"));

        await waitFor(() => expect(result.current.numericRate).toBeCloseTo(0.915));

        expect(parseDigitsAmount("")).toBeNull();
        expect(convertAmountWithRate(parseDigitsAmount(""), result.current.numericRate)).toBeNull();

        expect(parseDigitsAmount("12.3")).toBeNull();
        expect(convertAmountWithRate(parseDigitsAmount("12.3"), result.current.numericRate)).toBeNull();
    });
});
