import React, { useEffect, useState } from "react";
import axios from "axios";
import styles from "./ExchangeRateList.module.scss"

const ExchangeRateList = ({ currency }) => {

    const [exchangeRates, setExchangeRates] = useState(null);
    const [amount, setAmount] = useState(null)
    console.log(amount);

    const loadExchangeRate = () => {
        axios.get(`https://api.coinbase.com/v2/exchange-rates?currency=${currency?.value}`)
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
        {exchangeRates && currency && exchangeRates[currency.value] &&
            <div className={styles.container}>
                <input
                    type="number"
                    placeholder="Amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                />
                <span>
                    <label>Exchange Rate :</label>{parseFloat(exchangeRates[currency.value]).toFixed(4)}
                </span>
            </div>
        }
    </>


}


export default ExchangeRateList