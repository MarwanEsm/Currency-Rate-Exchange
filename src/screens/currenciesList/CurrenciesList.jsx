import React, { useState } from "react";
import CurrencySelect from "../../components/elements/currencySelector/CurrencySelect";
import Container from "../../components/layout/container/Container";
import Headline from "../../components/elements/headline/Headline";
import Logo from "../../components/elements/Logo/Logo";
import styles from "./CurrenciesList.module.scss";
import ExchangeRateList from "../exchangeRate/ExchangeRate";


const CurrenciesList = () => {

    const [fromCurrency, setFromCurrency] = useState(null)
    const [toCurrency, setToCurrency] = useState(null)

    return <Container>
        <div className={styles.listContainer}>
            <Headline size={2} character="!">Discover Real-Time Currency Exchange Rates Now</Headline>
            <Logo />

            <div className={styles.currencySelectorContainer}>
                <CurrencySelect
                    url={"https://api.coinbase.com/v2/currencies"}
                    placeholder={"From Currency"}
                    onCurrencySelect={(currency) => setFromCurrency(currency)}
                />
                <CurrencySelect
                    url={"https://api.coinbase.com/v2/currencies"}
                    placeholder={"To Currency"}
                    onCurrencySelect={(currency) => setToCurrency(currency)}
                />
            </div>
            {toCurrency !== null && <ExchangeRateList currency={toCurrency} />}

        </div>
    </Container>
}

export default CurrenciesList;
