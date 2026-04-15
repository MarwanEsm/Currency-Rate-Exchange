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
import { EXCHANGE_RATE_ERROR_CODES } from "../../services/exchangeRateProvider";

const PROVIDER_ERROR_MESSAGES = {
    [EXCHANGE_RATE_ERROR_CODES.NETWORK]: "Unable to reach the exchange rate provider. Please check your connection and try again.",
    [EXCHANGE_RATE_ERROR_CODES.HTTP]: "The exchange rate service is temporarily unavailable. Please try again later.",
    [EXCHANGE_RATE_ERROR_CODES.PARSE]: "Received unexpected data from the exchange rate provider.",
    [EXCHANGE_RATE_ERROR_CODES.INVALID_PAYLOAD]: "Received unexpected data from the exchange rate provider.",
};

const getProviderErrorMessage = (error) => {
    if (!error) return null;
    return PROVIDER_ERROR_MESSAGES[error.code] ?? "Unable to load exchange rates. Please try again.";
};

const CurrenciesList = () => {

    const [fromCurrency, setFromCurrency] = useState(null)
    const [toCurrency, setToCurrency] = useState(null)

    const [amount, setAmount] = useState("");
    const [hasConverted, setHasConverted] = useState(false);
    const { numericRate, providerError } = useExchangeRates(fromCurrency?.value, toCurrency?.value);

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

    const isConvertDisabled = !!providerError || numericRate === null;

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error("logout failed", error);
        }
    }

    const providerErrorMessage = getProviderErrorMessage(providerError);

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
                        value={fromCurrency}
                        aria-label="Select source currency"
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
                        disabledValue={fromCurrency?.value}
                        aria-label="Select target currency"
                    />
                </Col>
            </Row>

            <div className={styles.divider} />

            <Row className="justify-content-center">

                <Col lg={4} md={4} sm={6} className={styles.inputWrapper}>
                    <strong>{fromCurrency?.value}</strong>
                    <label htmlFor="conversion-amount" className={styles.srOnly}>Amount</label>
                    <input
                        id="conversion-amount"
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
                        <span className={styles.exchangeRateLabel}>Exchange Rate </span>
                        <b>{exchangeRate}</b>
                    </span>
                </Col>
            </Row>

            {providerErrorMessage && (
                <div className={styles.providerError} role="alert" aria-live="polite">
                    {providerErrorMessage}
                </div>
            )}

            <Button onClick={onConvert} disabled={isConvertDisabled}>
                {hasConverted && convertedAmount !== null
                    ? numberWithCommas(convertedAmount) + " " + `${toCurrency?.value !== undefined ? toCurrency?.value : ""}`
                    : "Convert"}
            </Button>
            {isAuthenticated && <Button variant="secondary" onClick={handleLogout}>Log out</Button>}
        </div>
    </Container>;
};

export default CurrenciesList;
