import { act, renderHook, waitFor } from "@testing-library/react";
import {
    createExchangeRateProviderError,
    EXCHANGE_RATE_ERROR_CODES,
    getExchangeRates,
} from "@/services/exchangeRateProvider";
import { clearExchangeRatesCache, EXCHANGE_RATES_CACHE_TTL_MS } from "@/utils/exchangeRatesCache";
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

    it("refetches in the background when cache TTL elapses while mounted (FCX-35)", async () => {
        jest.useFakeTimers();
        try {
            const t0 = new Date("2026-04-19T12:00:00.000Z").getTime();
            jest.setSystemTime(t0);

            getExchangeRates.mockResolvedValue(normalizedUsd);

            const { result } = renderHook(() => useExchangeRates("USD", "EUR"));

            await waitFor(() => expect(getExchangeRates).toHaveBeenCalledTimes(1));
            await waitFor(() => expect(result.current.numericRate).toBeCloseTo(0.915));

            getExchangeRates.mockResolvedValueOnce({
                ...normalizedUsd,
                fetchedAt: "2026-04-19T12:10:00.000Z",
                rates: { EUR: "0.99" },
            });

            await act(async () => {
                jest.advanceTimersByTime(EXCHANGE_RATES_CACHE_TTL_MS + 500);
            });

            await waitFor(() => expect(getExchangeRates).toHaveBeenCalledTimes(2));
            await waitFor(() => expect(result.current.numericRate).toBeCloseTo(0.99));
            expect(result.current.fetchedAt).toBe("2026-04-19T12:10:00.000Z");
        } finally {
            jest.useRealTimers();
        }
    });

    describe("staleness (FCX-31)", () => {
        const FROZEN_NOW = new Date("2026-04-19T12:00:00.000Z").getTime();

        beforeEach(() => {
            jest.useFakeTimers({ now: FROZEN_NOW });
            // Configure a fresh mock for fake-timer tests so we don't get a delayed promise resolution.
            getExchangeRates.mockResolvedValue({
                base: "USD",
                fetchedAt: new Date(FROZEN_NOW).toISOString(),
                rates: { EUR: "0.915" },
            });
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it("reports isStale=false and an age near zero immediately after fetch", async () => {
            const { result } = renderHook(() =>
                useExchangeRates("USD", "EUR", { staleAfterMs: 60_000 }),
            );

            await waitFor(() => expect(result.current.numericRate).toBeCloseTo(0.915));

            expect(result.current.isStale).toBe(false);
            expect(result.current.ageMs).toBeGreaterThanOrEqual(0);
            expect(result.current.ageMs).toBeLessThan(1_000);
            expect(result.current.fetchedAt).toBeTruthy();
        });

        it("flips to isStale=true once the configured staleAfterMs elapses", async () => {
            const { result } = renderHook(() =>
                useExchangeRates("USD", "EUR", { staleAfterMs: 60_000 }),
            );

            await waitFor(() => expect(result.current.numericRate).toBeCloseTo(0.915));
            expect(result.current.isStale).toBe(false);

            await act(async () => {
                jest.advanceTimersByTime(61_000);
            });

            expect(result.current.isStale).toBe(true);
            expect(result.current.ageMs).toBeGreaterThanOrEqual(60_000);
        });

        it("respects a custom staleAfterMs threshold", async () => {
            const { result } = renderHook(() =>
                useExchangeRates("USD", "EUR", { staleAfterMs: 500 }),
            );

            await waitFor(() => expect(result.current.numericRate).toBeCloseTo(0.915));

            await act(async () => {
                jest.advanceTimersByTime(15_000);
            });

            expect(result.current.isStale).toBe(true);
        });

        it("returns isStale=false and ageMs=null before the first successful fetch", () => {
            const { result } = renderHook(() => useExchangeRates(undefined, "EUR"));

            expect(result.current.isStale).toBe(false);
            expect(result.current.ageMs).toBeNull();
            expect(result.current.fetchedAt).toBeNull();
        });
    });
});
