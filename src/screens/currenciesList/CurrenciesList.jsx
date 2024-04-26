import React, { useState } from "react";
import CurrencySelect from "../../components/elements/currencySelector/CurrencySelect";
import Container from "../../components/layout/container/Container";
import Headline from "../../components/elements/headline/Headline";
import Logo from "../../components/elements/Logo/Logo";
import styles from "./CurrenciesList.module.scss";
import ExchangeRateList from "../exchangeRate/ExchangeRate";


const CurrenciesList = () => {

    const [selectedCurrency, setSelectedCurrency] = useState("")

    return <Container>
        <div className={styles.listContainer}>
            <Headline size={2} character="!">Discover Real-Time Currency Exchange Rates Now</Headline>
            <Logo />

            <CurrencySelect
                url={"https://api.coinbase.com/v2/currencies"}
                onCurrencySelect={(currency) => setSelectedCurrency(currency)}
            />

            <ExchangeRateList currency={selectedCurrency.value} />

        </div>
    </Container>
}

export default CurrenciesList;
