import React, { useState } from "react";
import CurrencySelect from "../../components/elements/currencySelector/CurrencySelect";
import Container from "../../components/layout/container/Container";
import Headline from "../../components/elements/headline/Headline";
import Logo from "../../components/elements/Logo/Logo";
import styles from "./CurrenciesList.module.scss";
import ExchangeRateList from "../exchangeRate/ExchangeRate";
import { Row, Col } from 'reactstrap';
import { useNavigate } from "react-router-dom";


const CurrenciesList = () => {

    const [fromCurrency, setFromCurrency] = useState(null)
    const [toCurrency, setToCurrency] = useState(null)

    const navigate = useNavigate()

    return <Container>
        <div className={styles.listContainer}>
            <Row className="justify-content-center">
                <Col lg={8} md={8} sm={10}>
                    <Headline size={2} character="!">
                        Discover Real-Time Currency Exchange Rates Now
                    </Headline>
                </Col>
            </Row>

            <Logo onClick={() => navigate("/")} />

            <Row className="justify-content-center">
                <Col lg={5} md={5} sm={6}>
                    <CurrencySelect
                        url={"https://api.coinbase.com/v2/currencies"}
                        placeholder={"From Currency"}
                        onCurrencySelect={(currency) => setFromCurrency(currency)}
                    />
                </Col>
                <Col lg={5} md={5} sm={6}>
                    <CurrencySelect
                        url={"https://api.coinbase.com/v2/currencies"}
                        placeholder={"To Currency"}
                        onCurrencySelect={(currency) => setToCurrency(currency)}
                    />
                </Col>
            </Row>
            {toCurrency !== null && <ExchangeRateList currency={toCurrency} />}

        </div>
    </Container>
}

export default CurrenciesList;
