import React from "react";
import ListOfCurrencies from "../../components/listOfCurrencies/ListOfCurrencies"
import Container from "../../components/layout/container/Container"
import Headline from "../../components/elements/headline/Headline";
import Logo from "../../components/elements/Logo/Logo";
import styles from "./CurrenciesList.module.scss"

const CurrenciesList = () =>
    <div>
        <Container />
        <div className={styles.list}>
            <Headline size={2} character="!" >Discover Real-Time Currency Exchange Rates Now</Headline>
            <Logo />
            <ListOfCurrencies onCurrencySelect={(value) => console.log(value)} />
        </div>
    </div>




export default CurrenciesList;
