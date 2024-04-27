import React, { useEffect, useState } from "react";
import axios from "axios";
import styles from "./ExchangeRateList.module.scss"
const ExchangeRateList = ({ toCurrency, fromCurrency }) => {
    const [exchangeRates, setExchangeRates] = useState(null);
    const [amount, setAmount] = useState(null);

    const numberWithCommas = (x) => {
        if (!x) return "";
        x = x.toString();
        var pattern = /(-?\d+)(\d{3})/;
        while (pattern.test(x))
            x = x.replace(pattern, "$1,$2");
        return x;
    };

    const loadExchangeRate = () => {
        axios.get(`https://api.coinbase.com/v2/exchange-rates?currency=${toCurrency?.value}`)
            .then(response => {
                if (response.data) {
                    setExchangeRates(response.data.data.rates);
                }
            })
            .catch(error => {
                console.error("Error fetching exchange rates:", error);
            });
    };

    useEffect(() => {
        loadExchangeRate();
    }, []);

    return (
        <>
            {exchangeRates && toCurrency && exchangeRates[toCurrency.value] && (
                <div className={styles.container}>
                    <div className={styles.inputWrapper}>
                        <strong>{fromCurrency.value}</strong>
                        <input
                            type="text"
                            placeholder="Amount"
                            value={numberWithCommas(amount)}
                            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                        />
                    </div>
                    <span>
                        <label>Exchange Rate</label>
                        <b>{parseFloat(exchangeRates[toCurrency.value]).toFixed(4)}</b>
                    </span>
                </div>
            )}
        </>
    );
};

export default ExchangeRateList;
