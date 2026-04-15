import { useEffect, useMemo, useRef, useState } from "react";

const useExchangeRates = (fromCurrencyCode, toCurrencyCode) => {
    const [exchangeRates, setExchangeRates] = useState(null);
    const requestIdRef = useRef(0);

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        if (!fromCurrencyCode) {
            setExchangeRates(null);
            return () => {
                isMounted = false;
                controller.abort();
            };
        }

        const fetchExchangeRates = async () => {
            const requestId = ++requestIdRef.current;
            try {
                const response = await fetch(
                    `https://api.coinbase.com/v2/exchange-rates?currency=${fromCurrencyCode}`,
                    { signal: controller.signal },
                );
                const json = await response.json();

                if (!isMounted || requestId !== requestIdRef.current) return;
                setExchangeRates(json.data?.rates ?? null);
            } catch (error) {
                if (error?.name === "AbortError") return;
                if (!isMounted || requestId !== requestIdRef.current) return;
                setExchangeRates(null);
            }
        };

        fetchExchangeRates();

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, [fromCurrencyCode]);

    const numericRate = useMemo(() => {
        const rawRate = exchangeRates?.[toCurrencyCode];
        const parsedRate = Number.parseFloat(rawRate);
        return Number.isFinite(parsedRate) ? parsedRate : null;
    }, [exchangeRates, toCurrencyCode]);

    return { exchangeRates, numericRate };
};

export default useExchangeRates;
