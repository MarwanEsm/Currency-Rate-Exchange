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
import {
    convertAmountWithRate,
    formatWholeAmountForDisplay,
    parseDigitsAmount,
    sanitizeAmountDigitString,
} from "../../utils/convertCurrencyAmount";
import { EXCHANGE_RATE_ERROR_CODES } from "../../services/exchangeRateProvider";
import { formatRelativeAge } from "../../utils/formatRelativeAge";

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
    const [amountTouched, setAmountTouched] = useState(false);
    const [convertInvalidAttempt, setConvertInvalidAttempt] = useState(false);
    const [inputAdjustmentNotice, setInputAdjustmentNotice] = useState(false);
    const {
        numericRate,
        providerError,
        isLoading,
        fetchedAt,
        ageMs,
        isStale,
        retryRates,
    } = useExchangeRates(fromCurrency?.value, toCurrency?.value);

    /* eslint-disable react-hooks/set-state-in-effect -- defensive reset when source and target match */
    useEffect(() => {
        if (fromCurrency && toCurrency && fromCurrency.value === toCurrency.value) {
            setToCurrency(null);
            setHasConverted(false);
        }
    }, [fromCurrency, toCurrency]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const { logout, isAuthenticated } = useContext(AuthContext)

    const router = useRouter()

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

    const providerErrorMessage = getProviderErrorMessage(providerError);
    const duplicateCurrencySelection =
        Boolean(fromCurrency && toCurrency && fromCurrency.value === toCurrency.value);
    const showPair = Boolean(fromCurrency && toCurrency);

    const amountValidationMessage = useMemo(() => {
        if (!showPair || providerErrorMessage || isLoading || numericRate === null) return null;
        if (numericAmount !== null) return null;
        if (amount !== "") return null;
        if (amountTouched || convertInvalidAttempt) {
            return "Enter an amount to convert.";
        }
        return null;
    }, [
        showPair,
        providerErrorMessage,
        isLoading,
        numericRate,
        numericAmount,
        amount,
        amountTouched,
        convertInvalidAttempt,
    ]);

    const showAmountHelperText = showPair && !providerErrorMessage && !isLoading && numericRate !== null;
    const showInputAdjustmentNotice = showAmountHelperText && inputAdjustmentNotice;
    const amountDescribedBy = [
        amountValidationMessage ? "amount-validation-message" : null,
        showInputAdjustmentNotice ? "amount-adjustment-notice" : null,
        showAmountHelperText ? "amount-helper-text" : null,
    ]
        .filter(Boolean)
        .join(" ") || undefined;

    const onConvert = () => {
        if (!showPair || !!providerError || isLoading || numericRate === null) return;
        if (convertedValue === null) {
            setConvertInvalidAttempt(true);
            setHasConverted(false);
            return;
        }
        setConvertInvalidAttempt(false);
        setHasConverted(true);
    };

    const isConvertDisabled =
        !showPair || !!providerError || isLoading || numericRate === null;

    const onAmountKeyDown = (event) => {
        if (event.key !== "Enter") return;
        if (isConvertDisabled) return;
        event.preventDefault();
        onConvert();
    };

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error("logout failed", error);
        }
    };

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

    const relativeAgeLabel = useMemo(() => formatRelativeAge(ageMs), [ageMs]);

    const showRate = Boolean(showPair && !providerErrorMessage && !isLoading && formattedRate !== null);
    const showStaleIndicator = Boolean(showRate && isStale);

    const exchangeRateGroupAriaLabel = useMemo(() => {
        if (!showPair) return "Exchange rate";
        if (providerErrorMessage) return "Exchange rate unavailable.";
        if (isLoading) return "Loading exchange rate";
        if (formattedRate !== null && fromCurrency && toCurrency) {
            const line = `1 ${fromCurrency.value} = ${formattedRate} ${toCurrency.value}`;
            const stalePrefix = showStaleIndicator ? "Stale rate, " : "";
            const ageSuffix = relativeAgeLabel ? `, updated ${relativeAgeLabel}` : "";
            const absoluteSuffix = fetchedAtLabel ? `, as of ${fetchedAtLabel}` : "";
            return `${stalePrefix}${line}${ageSuffix}${absoluteSuffix}`;
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
        relativeAgeLabel,
        showStaleIndicator,
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
            const updatedLine = relativeAgeLabel && fetchedAtLabel
                ? `Rates updated ${relativeAgeLabel} (${fetchedAtLabel})`
                : fetchedAtLabel
                    ? `Rates updated ${fetchedAtLabel}`
                    : null;
            return (
                <>
                    <b className={styles.rateFigure}>
                        1 {fromCurrency.value} = {formattedRate} {toCurrency.value}
                    </b>
                    {showStaleIndicator ? (
                        <span className={styles.staleBadge} role="status" data-testid="stale-rate-badge">
                            Stale rate
                        </span>
                    ) : null}
                    {updatedLine ? (
                        <span className={styles.rateUpdatedLabel}>{updatedLine}</span>
                    ) : null}
                    {showStaleIndicator ? (
                        <button
                            type="button"
                            className={styles.refreshRateButton}
                            onClick={retryRates}
                            disabled={isLoading}
                        >
                            Refresh rate
                        </button>
                    ) : null}
                </>
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
                            setAmountTouched(false);
                            setConvertInvalidAttempt(false);
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
                            setConvertInvalidAttempt(false);
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
                        value={formatWholeAmountForDisplay(amount)}
                        aria-invalid={amountValidationMessage ? "true" : "false"}
                        aria-keyshortcuts="Enter"
                        aria-describedby={amountDescribedBy}
                        onChange={(e) => {
                            const raw = e.target.value;
                            const sanitized = sanitizeAmountDigitString(raw);
                            const wasAdjusted = sanitized !== raw && raw.length > 0;
                            setAmount(sanitized);
                            if (wasAdjusted) {
                                setInputAdjustmentNotice(true);
                            } else if (sanitized === "") {
                                setInputAdjustmentNotice(false);
                            }
                            setHasConverted(false);
                            setConvertInvalidAttempt(false);
                        }}
                        onBlur={() => setAmountTouched(true)}
                        onKeyDown={onAmountKeyDown}
                    />
                    {showAmountHelperText ? (
                        <div
                            id="amount-helper-text"
                            className={styles.amountHelperText}
                        >
                            Whole positive numbers only — decimals and minus signs are ignored.
                        </div>
                    ) : null}
                    {showInputAdjustmentNotice ? (
                        <div
                            id="amount-adjustment-notice"
                            className={styles.amountAdjustmentNotice}
                            role="status"
                            aria-live="polite"
                        >
                            Removed unsupported characters from your input.
                        </div>
                    ) : null}
                    {amountValidationMessage ? (
                        <div
                            id="amount-validation-message"
                            className={styles.amountValidationMessage}
                            role="status"
                            aria-live="polite"
                        >
                            {amountValidationMessage}
                        </div>
                    ) : null}
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
                            <span>{providerErrorMessage}</span>
                            <button
                                type="button"
                                className={styles.retryButton}
                                onClick={retryRates}
                                disabled={isLoading}
                            >
                                {isLoading ? "Retrying..." : "Retry"}
                            </button>
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
