import React, { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CurrenciesContext } from "../../context/CurrenciesContext";
import Converter from "../../components/elements/converter/Converter";
import { Link } from "react-router-dom";
import { Nav, Navbar } from "react-bootstrap";
import styles from "./ExchangeRateList.module.scss"

const ExchangeRateList = () => {

    const [searchedCurrency, setSearchedCurrency] = useState("");

    const { fetchExchangeRate, exchangeRates } = useContext(CurrenciesContext);
    const { currency } = useParams();

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
            <div className={styles.container}>
                <div>
                    <Navbar collapseOnSelect expand="lg" bg="white">
                        <Navbar.Brand href="#home"></Navbar.Brand>
                        <Navbar.Toggle aria-controls="responsive-navbar-nav" />
                        <Navbar.Collapse id="responsive-navbar-nav">
                            <Nav className="mr-auto">
                                <Link to="/">
                                    Logout
                                </Link>
                                <Link to="/ChatScreen">
                                    Chat
                                </Link>
                                <Link to="/currenciesList">
                                    Back
                                </Link>
                            </Nav>
                        </Navbar.Collapse>
                    </Navbar>
                </div>
            </div>
            <div>

                <div className={styles.section}></div>
                <h2 >Selected currency </h2>
                <h3 >{currency} </h3>
                <h2 >Conversion currency</h2>
                <input
                    type="text"
                    placeholder="Search here"
                    value={searchedCurrency}
                    onChange={handleSearch}
                    className="form-control"
                    id="inputGroup-sizing-sm"
                />

                <br />

                <div className={styles.exchangeContainer}>
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
                    <Converter searchedCurrency={searchedCurrency} />
                </div>

                <br />
            </div>
        </div>
    );
}


export default ExchangeRateList;
