import React, { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CurrenciesContext } from "../../context/CurrenciesContext";
import Converter from "../../components/elements/converter/Converter";
import { Link } from "react-router-dom";
import { Nav, Navbar } from "react-bootstrap";
import styles from "./ExchangeRateList.module.scss"
import Async from "react-select"

const ExchangeRateList = ({ currency }) => {

    const [searchedCurrency, setSearchedCurrency] = useState("");

    const { fetchExchangeRate, exchangeRates } = useContext(CurrenciesContext);

    useEffect(() => {
        fetchExchangeRate(currency);
    }, [currency]);


    const handleSearch = (event) => {
        const searchValue = event.target.value;
        setSearchedCurrency(searchValue);
    };

    const displayInSearchBar = (event) => {
        setSearchedCurrency(event.target.value);
    };

    const filteredRates = () => {
        const result = Object.keys(exchangeRates.rates).filter((rate) => {
            return (
                exchangeRates.currency !== rate &&
                rate.includes(searchedCurrency.toUpperCase())
            );
        });

        return result;
    };

    return (
        <div>
            <div>
                {/* <div className={styles.exchangeContainer}>
                    {exchangeRates &&
                        filteredRates().map((key, i) => (
                            <div key={i}>
                                <p>
                                    <button
                                        className="badge badge-pill badge-primary"
                                        value={key}
                                        onClick={displayInSearchBar}
                                    >
                                        {key} &nbsp;
                                    </button>
                                    <span
                                        className="badge badge-pill badge-warning"
                                    >
                                        {parseFloat(exchangeRates.rates[key]).toFixed(4)}
                                    </span>
                                </p>
                            </div>
                        ))}
                    {/* <Converter searchedCurrency={searchedCurrency} /> */}
                {/* </div> */}

                <br />
            </div>
        </div>
    );
}


export default ExchangeRateList;
