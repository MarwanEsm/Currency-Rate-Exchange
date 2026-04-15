import React, { useState, useContext, useMemo } from "react";
import CurrencySelect from "../../components/elements/currencySelector/CurrencySelect";
import Container from "../../components/layout/container/Container";
import Headline from "../../components/elements/headline/Headline";
import Logo from "../../components/elements/logo/Logo";
import styles from "./CurrenciesList.module.scss";
import Button from "../../components/elements/button/Button";
import { Row, Col } from 'reactstrap';
import { useRouter } from "next/router";
import { AuthContext } from "../../firebase/authContext";
import useExchangeRates from "../../utils/useExchangeRates";



const CurrenciesList = () => {

    const [fromCurrency, setFromCurrency] = useState(null)
    const [toCurrency, setToCurrency] = useState(null)

    const [amount, setAmount] = useState("");
    const [hasConverted, setHasConverted] = useState(false);
    const { numericRate } = useExchangeRates(fromCurrency?.value, toCurrency?.value);

    const { logout, isAuthenticated } = useContext(AuthContext)

    const router = useRouter()

    const numberWithCommas = (x) => {
        if (!x) return "";
        x = x.toString();
        var pattern = /(-?\d+)(\d{3})/;
        while (pattern.test(x))
            x = x.replace(pattern, "$1,$2");
        return x;
    };

    const exchangeRate = useMemo(() => {
        return numericRate === null ? "" : numericRate.toFixed(4);
    }, [numericRate]);

    const numericAmount = useMemo(() => {
        const parsedAmount = Number(amount);
        return Number.isFinite(parsedAmount) ? parsedAmount : null;
    }, [amount]);

    const convertedAmount = useMemo(() => {
        if (numericAmount === null || numericRate === null) return null;
        return (numericAmount * numericRate).toFixed(2);
    }, [numericAmount, numericRate]);

    const onConvert = () => setHasConverted(true);



    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error("logout failed", error);
        }
    }

    return <Container>
        <div className={styles.listContainer}>

            <Row className="justify-content-center">
                <Col lg={8} md={8} sm={10}>
                    <Headline size={2} character="!">
                        Discover Real-Time Currency Exchange Rates Now
                    </Headline>
                </Col>
            </Row>

            <Logo onClick={() => router.push("/")} />

            <Row className="justify-content-center">

                <Col lg={4} md={4} sm={6}>
                    <CurrencySelect
                        url={"https://api.coinbase.com/v2/currencies"}
                        placeholder={"From Currency"}
                        onCurrencySelect={(currency) => {
                            setFromCurrency(currency)
                            setToCurrency(null)
                            setAmount("");
                            setHasConverted(false);
                        }}
                    />
                </Col>

                <Col lg={4} md={4} sm={6}>
                    <CurrencySelect
                        url={"https://api.coinbase.com/v2/currencies"}
                        placeholder={"To Currency"}
                        onCurrencySelect={(currency) => {
                            setToCurrency(currency);
                            setHasConverted(false);
                        }}
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
                        onChange={(e) => {
                            setAmount(e.target.value.replace(/\D/g, ''));
                            setHasConverted(false);
                        }}
                    />
                </Col>


                <Col lg={4} md={4} sm={6} className={styles.exchangeRateWrapper}>
                    <span>
                        <label>Exchange Rate </label>
                        <b>{exchangeRate}</b>
                    </span>
                </Col>
            </Row>

            <Button onClick={onConvert}>
                {hasConverted && convertedAmount !== null
                    ? numberWithCommas(convertedAmount) + " " + `${toCurrency?.value !== undefined ? toCurrency?.value : ""}`
                    : "Convert"}
            </Button>
            {isAuthenticated && <Button variant="secondary" onClick={handleLogout}>Log out</Button>}
        </div>
    </Container>;
};

export default CurrenciesList;
