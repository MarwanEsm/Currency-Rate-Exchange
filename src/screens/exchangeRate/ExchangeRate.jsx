import React, { useEffect, useState } from "react";
import axios from "axios";
import styles from "./ExchangeRateList.module.scss"

const ExchangeRateList = ({ toCurrency, fromCurrency }) => {

    const [exchangeRates, setExchangeRates] = useState(null);
    const [amount, setAmount] = useState(null)
    console.log(amount);

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
    }

    useEffect(() => {
        loadExchangeRate();
    }, []);


    return <>
        {exchangeRates && toCurrency && exchangeRates[toCurrency.value] &&
            <div className={styles.container}>
                <div className={styles.inputWrapper}>
                    <strong>{`${fromCurrency.value}`}</strong>
                    <input
                        type="number"
                        placeholder={`Amount ${fromCurrency.value}`}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                </div>
                <span>
                    <label>Exchange Rate</label>{parseFloat(exchangeRates[toCurrency.value]).toFixed(4)}
                </span>
            </div>
        }
    </>


}


export default ExchangeRateList