import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getExchangeRates } from "@/services/exchangeRateProvider";
import {
    getMsUntilExchangeRatesCacheExpiry,
    invalidateExchangeRatesCache,
    readExchangeRatesCache,
    writeExchangeRatesCache,
} from "@/utils/exchangeRatesCache";

/**
 * Caching & refresh (FCX-35):
 * - Successful fetches are written to `exchangeRatesCache` and reused until `EXCHANGE_RATES_CACHE_TTL_MS`.
 * - While mounted, a `setTimeout` schedules `retryRates` at that TTL so the UI gets fresh data without
 *   refetching on every render. Manual **Retry** / **Refresh rate** still calls `retryRates` immediately.
 * - UI freshness vs market staleness: `EXCHANGE_RATE_STALE_AFTER_MS` (FCX-31) is separate — it only
 *   drives the “stale” affordance; TTL drives network reuse.
 *
 * After this many milliseconds elapse since `fetchedAt`, the rate is considered "stale" — the
 * value is still shown, but the UI must indicate it may no longer reflect the live market (FCX-31).
 * Decoupled from `EXCHANGE_RATES_CACHE_TTL_MS`: cache TTL controls re-fetching, this controls UI.
 */
export const EXCHANGE_RATE_STALE_AFTER_MS = 60 * 1000;

/**
 * How often the hook re-evaluates `ageMs` / `isStale` while a rate is on screen, so the UI flips
 * fresh → stale on its own without waiting for an unrelated re-render.
 */
const STALENESS_TICK_INTERVAL_MS = 15 * 1000;

const useExchangeRates = (fromCurrencyCode, toCurrencyCode, options) => {
    const staleAfterMs = options?.staleAfterMs ?? EXCHANGE_RATE_STALE_AFTER_MS;
    const [exchangeRatesSnapshot, setExchangeRatesSnapshot] = useState(null);
    const [providerError, setProviderError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [retryToken, setRetryToken] = useState(0);
    const [nowMs, setNowMs] = useState(() => Date.now());
    const requestIdRef = useRef(0);

    const retryRates = useCallback(() => {
        if (fromCurrencyCode) {
            invalidateExchangeRatesCache(fromCurrencyCode);
        }
        setRetryToken((prev) => prev + 1);
    }, [fromCurrencyCode]);

    const retryRatesRef = useRef(retryRates);
    retryRatesRef.current = retryRates;

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        if (!fromCurrencyCode) {
            setIsLoading(false);
            return () => {
                isMounted = false;
                controller.abort();
            };
        }

        const requestId = ++requestIdRef.current;

        const cachedPayload = readExchangeRatesCache(fromCurrencyCode);
        if (cachedPayload) {
            setProviderError(null);
            setExchangeRatesSnapshot({
                baseCurrencyCode: cachedPayload.base,
                rates: cachedPayload.rates,
                fetchedAt: cachedPayload.fetchedAt,
            });
            setIsLoading(false);
            return () => {
                isMounted = false;
                controller.abort();
            };
        }

        setProviderError(null);
        setIsLoading(true);

        const fetchExchangeRates = async () => {
            try {
                const normalizedPayload = await getExchangeRates(fromCurrencyCode, controller.signal);

                if (!isMounted || requestId !== requestIdRef.current) return;
                writeExchangeRatesCache(fromCurrencyCode, normalizedPayload);
                setExchangeRatesSnapshot({
                    baseCurrencyCode: normalizedPayload.base,
                    rates: normalizedPayload.rates,
                    fetchedAt: normalizedPayload.fetchedAt,
                });
            } catch (error) {
                if (error?.name === "AbortError") return;
                if (!isMounted || requestId !== requestIdRef.current) return;
                setProviderError(error);
                setExchangeRatesSnapshot({
                    baseCurrencyCode: fromCurrencyCode,
                    rates: null,
                    fetchedAt: null,
                });
            } finally {
                if (!isMounted || requestId !== requestIdRef.current) return;
                setIsLoading(false);
            }
        };

        fetchExchangeRates();

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, [fromCurrencyCode, retryToken]);

    useEffect(() => {
        if (!fromCurrencyCode) return undefined;
        if (isLoading) return undefined;
        if (!exchangeRatesSnapshot?.rates) return undefined;
        if (exchangeRatesSnapshot.baseCurrencyCode !== fromCurrencyCode) return undefined;

        const ms = getMsUntilExchangeRatesCacheExpiry(fromCurrencyCode);
        if (ms === null) return undefined;

        const id = window.setTimeout(() => {
            retryRatesRef.current();
        }, ms);

        return () => window.clearTimeout(id);
    }, [fromCurrencyCode, isLoading, exchangeRatesSnapshot, retryToken]);

    const exchangeRates = useMemo(() => {
        if (!fromCurrencyCode) return null;
        if (exchangeRatesSnapshot?.baseCurrencyCode !== fromCurrencyCode) return null;
        return exchangeRatesSnapshot?.rates ?? null;
    }, [exchangeRatesSnapshot, fromCurrencyCode]);

    const numericRate = useMemo(() => {
        const rawRate = exchangeRates?.[toCurrencyCode];
        const parsedRate = Number.parseFloat(rawRate);
        return Number.isFinite(parsedRate) ? parsedRate : null;
    }, [exchangeRates, toCurrencyCode]);

    const fetchedAt = useMemo(() => {
        if (!fromCurrencyCode) return null;
        if (exchangeRatesSnapshot?.baseCurrencyCode !== fromCurrencyCode) return null;
        if (!exchangeRatesSnapshot?.rates) return null;
        return exchangeRatesSnapshot.fetchedAt ?? null;
    }, [exchangeRatesSnapshot, fromCurrencyCode]);

    const fetchedAtMs = useMemo(() => {
        if (!fetchedAt) return null;
        const parsed = new Date(fetchedAt).getTime();
        return Number.isFinite(parsed) ? parsed : null;
    }, [fetchedAt]);

    const ageMs = useMemo(() => {
        if (fetchedAtMs === null) return null;
        return Math.max(0, nowMs - fetchedAtMs);
    }, [fetchedAtMs, nowMs]);

    const isStale = useMemo(() => {
        if (ageMs === null) return false;
        return ageMs > staleAfterMs;
    }, [ageMs, staleAfterMs]);

    useEffect(() => {
        if (fetchedAtMs === null || typeof setInterval !== "function") return undefined;
        setNowMs(Date.now());
        const intervalId = setInterval(() => setNowMs(Date.now()), STALENESS_TICK_INTERVAL_MS);
        return () => clearInterval(intervalId);
    }, [fetchedAtMs]);

    return {
        exchangeRates,
        numericRate,
        providerError,
        isLoading,
        fetchedAt,
        ageMs,
        isStale,
        retryRates,
    };
};

export default useExchangeRates;
