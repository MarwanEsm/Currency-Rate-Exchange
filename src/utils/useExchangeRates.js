import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getExchangeRates } from "@/services/exchangeRateProvider";
import {
    invalidateExchangeRatesCache,
    readExchangeRatesCache,
    writeExchangeRatesCache,
} from "@/utils/exchangeRatesCache";

const useExchangeRates = (fromCurrencyCode, toCurrencyCode) => {
    const [exchangeRatesSnapshot, setExchangeRatesSnapshot] = useState(null);
    const [providerError, setProviderError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [retryToken, setRetryToken] = useState(0);
    const requestIdRef = useRef(0);

    const retryRates = useCallback(() => {
        if (fromCurrencyCode) {
            invalidateExchangeRatesCache(fromCurrencyCode);
        }
        setRetryToken((prev) => prev + 1);
    }, [fromCurrencyCode]);

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

    return { exchangeRates, numericRate, providerError, isLoading, fetchedAt, retryRates };
};

export default useExchangeRates;
