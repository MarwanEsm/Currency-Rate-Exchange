import React, { useState, useEffect, useContext } from "react";
import CurrencySelect from "../../components/elements/currencySelector/CurrencySelect";
import Container from "../../components/layout/container/Container";
import Headline from "../../components/elements/headline/Headline";
import Logo from "../../components/elements/logo/Logo";
import styles from "./CurrenciesList.module.scss";
import Button from "../../components/elements/button/Button";
import { Row, Col } from 'reactstrap';
import { useNavigate } from "react-router-dom";
import { usePrevious } from "../../utils/utils"



const CurrenciesList = () => {

    const [fromCurrency, setFromCurrency] = useState(null)
    const [toCurrency, setToCurrency] = useState(null)

    const [exchangeRates, setExchangeRates] = useState(null);
    const [exchangeRate, setExchangeRate] = useState("0,0")

    const [amount, setAmount] = useState(null);
    const [result, setResult] = useState(null);

    const navigate = useNavigate()

    const numberWithCommas = (x) => {
        if (!x) return "";
        x = x.toString();
        var pattern = /(-?\d+)(\d{3})/;
        while (pattern.test(x))
            x = x.replace(pattern, "$1,$2");
        return x;
    };

    const loadExchangeRate = async () => {
        const response = await fetch(`https://api.coinbase.com/v2/exchange-rates?currency=${toCurrency?.value}`)
        const json = await response.json()
        const ratesList = json.data?.rates
        setExchangeRates(ratesList)
        const exchangeRate = exchangeRates !== null && toCurrency?.value !== null ? parseFloat(exchangeRates[toCurrency?.value]).toFixed(4) : 0
        setExchangeRate(exchangeRate)
    };


    useEffect(() => {
        exchangeRate === 0 && loadExchangeRate()
        if (exchangeRate !== 0 && exchangeRate !== "0,0" && amount !== null) {
            onConvert(exchangeRate);
        }
    }, [exchangeRate])


    useEffect(() => {
        toCurrency !== null && loadExchangeRate()
    }, [toCurrency?.value])


    const onConvert = () => {
        const result = (amount * exchangeRate).toFixed(2);
        if (exchangeRate !== "0,0") {
            setResult(result);
        }
    };

    useEffect(() => {
        amount !== null && exchangeRate !== "-" && onConvert()
    }, [amount, exchangeRate])


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

                <Col lg={4} md={4} sm={6}>
                    <CurrencySelect
                        url={"https://api.coinbase.com/v2/currencies"}
                        placeholder={"From Currency"}
                        onCurrencySelect={(currency) => {
                            setFromCurrency(currency)
                            setToCurrency(null)
                            setExchangeRate(null)
                        }}
                    />
                </Col>

                <Col lg={4} md={4} sm={6}>
                    <CurrencySelect
                        url={"https://api.coinbase.com/v2/currencies"}
                        placeholder={"To Currency"}
                        onCurrencySelect={(currency) => setToCurrency(currency)}
                        value={toCurrency}
                    />
                </Col>
            </Row>

            <div className={styles.divider} />

            <Row className="justify-content-center">

                <Col lg={4} md={4} sm={6} className={styles.inputWrapper}>
                    <strong>{fromCurrency?.value}</strong>
                    <input
                        type="text"
                        placeholder="Amount"
                        value={numberWithCommas(amount)}
                        onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                    />
                </Col>


                <Col lg={4} md={4} sm={6} className={styles.exchangeRateWrapper}>
                    <span>
                        <label>Exchange Rate </label>
                        <b>{exchangeRate !== 0 ? exchangeRate : ""}</b>
                    </span>
                </Col>
            </Row>

            <Button onClick={onConvert}>
                {result === null ? "Convert" : numberWithCommas(result) + " " + `${toCurrency?.value !== undefined ? toCurrency?.value : ""}`}
            </Button>



        </div>
    </Container>
}

export default CurrenciesList;
