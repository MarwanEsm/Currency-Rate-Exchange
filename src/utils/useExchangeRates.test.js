import { act, renderHook, waitFor } from "@testing-library/react";
import {
    createExchangeRateProviderError,
    EXCHANGE_RATE_ERROR_CODES,
    getExchangeRates,
} from "@/services/exchangeRateProvider";
import { clearExchangeRatesCache } from "@/utils/exchangeRatesCache";
import useExchangeRates from "./useExchangeRates";

jest.mock("@/services/exchangeRateProvider", () => ({
    ...jest.requireActual("@/services/exchangeRateProvider"),
    getExchangeRates: jest.fn(),
}));

const normalizedUsd = {
    base: "USD",
    fetchedAt: "2026-04-19T12:00:00.000Z",
    rates: { EUR: "0.915", GBP: "0.79" },
};

describe("useExchangeRates", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        clearExchangeRatesCache();
        getExchangeRates.mockResolvedValue(normalizedUsd);
    });

    it("does not fetch when base currency is not set", () => {
        const { result } = renderHook(() => useExchangeRates(undefined, "EUR"));

        expect(result.current.numericRate).toBeNull();
        expect(result.current.isLoading).toBe(false);
        expect(getExchangeRates).not.toHaveBeenCalled();
    });

    it("fetches rates when base is set and exposes numeric rate for target", async () => {
        const { result } = renderHook(() => useExchangeRates("USD", "EUR"));

        await waitFor(() => expect(getExchangeRates).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(getExchangeRates).toHaveBeenCalledWith("USD", expect.any(AbortSignal));
        expect(result.current.numericRate).toBeCloseTo(0.915);
        expect(result.current.providerError).toBeNull();
        expect(result.current.fetchedAt).toBe(normalizedUsd.fetchedAt);
    });

    it("returns null numeric rate when target is missing from rates", async () => {
        const { result } = renderHook(() => useExchangeRates("USD", "JPY"));

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.numericRate).toBeNull();
        expect(result.current.providerError).toBeNull();
    });

    it("sets providerError on failed fetch", async () => {
        const err = createExchangeRateProviderError(
            EXCHANGE_RATE_ERROR_CODES.NETWORK,
            "network failed",
        );
        getExchangeRates.mockRejectedValueOnce(err);

        const { result } = renderHook(() => useExchangeRates("USD", "EUR"));

        await waitFor(() => expect(result.current.providerError).toBeTruthy());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.providerError?.code).toBe(EXCHANGE_RATE_ERROR_CODES.NETWORK);
        expect(result.current.numericRate).toBeNull();
    });

    it("reuses cache on remount without calling getExchangeRates again", async () => {
        const first = renderHook(() => useExchangeRates("USD", "EUR"));
        await waitFor(() => expect(first.result.current.numericRate).toBeCloseTo(0.915));
        expect(getExchangeRates).toHaveBeenCalledTimes(1);
        first.unmount();

        const second = renderHook(() => useExchangeRates("USD", "EUR"));
        await waitFor(() => expect(second.result.current.numericRate).toBeCloseTo(0.915));

        expect(getExchangeRates).toHaveBeenCalledTimes(1);
    });

    it("refetches after retryRates invalidates cache", async () => {
        const { result } = renderHook(() => useExchangeRates("USD", "EUR"));

        await waitFor(() => expect(result.current.numericRate).toBeCloseTo(0.915));
        expect(getExchangeRates).toHaveBeenCalledTimes(1);

        getExchangeRates.mockResolvedValueOnce({
            ...normalizedUsd,
            rates: { EUR: "1.1", GBP: "0.79" },
        });

        await act(async () => {
            result.current.retryRates();
        });

        await waitFor(() => expect(getExchangeRates).toHaveBeenCalledTimes(2));
        await waitFor(() => expect(result.current.numericRate).toBeCloseTo(1.1));
    });

    it("refetches when base currency changes", async () => {
        const { result, rerender } = renderHook(
            ({ from, to }) => useExchangeRates(from, to),
            { initialProps: { from: "USD", to: "EUR" } },
        );

        await waitFor(() => expect(getExchangeRates).toHaveBeenCalledWith("USD", expect.any(AbortSignal)));

        getExchangeRates.mockResolvedValueOnce({
            base: "GBP",
            fetchedAt: "2026-04-19T13:00:00.000Z",
            rates: { EUR: "1.2" },
        });

        rerender({ from: "GBP", to: "EUR" });

        await waitFor(() => expect(getExchangeRates).toHaveBeenCalledWith("GBP", expect.any(AbortSignal)));
        await waitFor(() => expect(result.current.numericRate).toBeCloseTo(1.2));
    });
});
