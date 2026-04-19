import React, { useState, useContext, useMemo, useEffect } from "react";
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
import { convertAmountWithRate, parseDigitsAmount } from "../../utils/convertCurrencyAmount";
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
    const { numericRate, providerError, isLoading, fetchedAt } = useExchangeRates(
        fromCurrency?.value,
        toCurrency?.value,
    );

    useEffect(() => {
        if (fromCurrency && toCurrency && fromCurrency.value === toCurrency.value) {
            setToCurrency(null);
            setHasConverted(false);
        }
    }, [fromCurrency, toCurrency]);

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

    const numericAmount = useMemo(() => parseDigitsAmount(amount), [amount]);

    const convertedValue = useMemo(() => {
        if (numericAmount === null || numericRate === null) return null;
        return convertAmountWithRate(numericAmount, numericRate);
    }, [numericAmount, numericRate]);

    const formattedConverted = useMemo(() => {
        if (convertedValue === null) return null;
        return new Intl.NumberFormat(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(convertedValue);
    }, [convertedValue]);

    const onConvert = () => {
        if (convertedValue === null) return;
        setHasConverted(true);
    };

    const isConvertDisabled =
        !!providerError ||
        isLoading ||
        numericRate === null ||
        numericAmount === null ||
        convertedValue === null;

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error("logout failed", error);
        }
    }

    const providerErrorMessage = getProviderErrorMessage(providerError);
    const duplicateCurrencySelection =
        Boolean(fromCurrency && toCurrency && fromCurrency.value === toCurrency.value);
    const showPair = Boolean(fromCurrency && toCurrency);

    const formattedRate = useMemo(() => {
        if (numericRate === null) return null;
        return new Intl.NumberFormat(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 6,
        }).format(numericRate);
    }, [numericRate]);

    const fetchedAtLabel = useMemo(() => {
        if (!fetchedAt) return null;
        const parsed = new Date(fetchedAt);
        if (Number.isNaN(parsed.getTime())) return null;
        return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(parsed);
    }, [fetchedAt]);

    const exchangeRateGroupAriaLabel = useMemo(() => {
        if (!showPair) return "Exchange rate";
        if (providerErrorMessage) return "Exchange rate unavailable.";
        if (isLoading) return "Loading exchange rate";
        if (formattedRate !== null && fromCurrency && toCurrency) {
            const line = `1 ${fromCurrency.value} = ${formattedRate} ${toCurrency.value}`;
            return fetchedAtLabel ? `${line}, as of ${fetchedAtLabel}` : line;
        }
        return "Exchange rate unavailable for this pair.";
    }, [
        showPair,
        providerErrorMessage,
        isLoading,
        formattedRate,
        fromCurrency,
        toCurrency,
        fetchedAtLabel,
    ]);

    const renderExchangeRatePanelBody = () => {
        if (!showPair) {
            return <span className={styles.exchangeRateTitle}>Exchange rate</span>;
        }
        if (providerErrorMessage) {
            return <b className={styles.rateFigure}>—</b>;
        }
        if (isLoading) {
            return <span className={styles.rateLoading}>Loading…</span>;
        }
        if (formattedRate !== null) {
            return (
                <b className={styles.rateFigure}>
                    1 {fromCurrency.value} = {formattedRate} {toCurrency.value}
                </b>
            );
        }
        return (
            <span className={styles.rateUnavailable}>
                Rate unavailable for this pair.
            </span>
        );
    };

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
                        inputId="from-currency"
                        label="Select source currency"
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
                        inputId="to-currency"
                        label="Select target currency"
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
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="off"
                        placeholder="Amount"
                        value={numberWithCommas(amount)}
                        onChange={(e) => {
                            setAmount(e.target.value.replace(/\D/g, ''));
                            setHasConverted(false);
                        }}
                    />
                </Col>


                <Col
                    lg={4}
                    md={4}
                    sm={6}
                    className={`${styles.exchangeRateWrapper} text-center`}
                >
                    <div
                        className={styles.exchangeRatePanel}
                        role="group"
                        aria-label={exchangeRateGroupAriaLabel}
                        aria-busy={showPair && isLoading && !providerErrorMessage ? true : undefined}
                    >
                        <span className={styles.exchangeRateValue} aria-live="polite">
                            {renderExchangeRatePanelBody()}
                        </span>
                    </div>
                    {providerErrorMessage && (
                        <div className={styles.providerError} role="alert">
                            {providerErrorMessage}
                        </div>
                    )}
                </Col>
            </Row>

            {duplicateCurrencySelection && (
                <div className={styles.duplicateCurrencyMessage} role="alert">
                    Source and target currencies must be different. Choose another target currency.
                </div>
            )}

            <Button onClick={onConvert} disabled={isConvertDisabled}>
                {hasConverted && formattedConverted !== null
                    ? `${formattedConverted} ${toCurrency?.value ?? ""}`.trim()
                    : "Convert"}
            </Button>
            {isAuthenticated && <Button variant="secondary" onClick={handleLogout}>Log out</Button>}
        </div>
    </Container>;
};

export default CurrenciesList;
