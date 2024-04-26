import React, { useEffect, useState } from "react";
import styles from "./ExchangeRateList.module.scss"
import axios from "axios";

const ExchangeRateList = ({ currency }) => {

    const [exchangeRates, setExchangeRates] = useState(null);
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


    return (
        <div>
            <div className={styles.exchangeContainer}>
                {exchangeRates && currency && exchangeRates[currency.value] &&
                    <div>
                        <p>
                            <span className="badge badge-pill badge-warning">
                                {parseFloat(exchangeRates[currency.value]).toFixed(4)}
                            </span>
                        </p>
                    </div>
                }
            </div>
            <br />
        </div>
    );
}


export default ExchangeRateList