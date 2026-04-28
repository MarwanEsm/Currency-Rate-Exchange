import React, { useState, useContext, useMemo, useEffect } from "react";
import CurrencySelect from "../../components/elements/currencySelector/CurrencySelect";
import Container from "../../components/layout/container/Container";
import Headline from "../../components/elements/headline/Headline";
import Logo from "../../components/elements/logo/Logo";
import FundFiatModal from "./FundFiatModal";
import styles from "./CurrenciesList.module.scss";
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

const AMOUNT_FIELD_HELPER =
    "Whole positive numbers only — decimals and minus signs are ignored.";
const AMOUNT_INPUT_ADJUSTMENT_NOTICE = "Removed unsupported characters from your input.";

const AmountInfoIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.25" />
        <path
            fill="currentColor"
            d="M8 4.35a.72.72 0 1 1 0 1.45.72.72 0 0 1 0-1.45zm-.55 2.65h1.1v4.65h-1.1V7z"
        />
    </svg>
);

const RateUpdateClockIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="9.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            d="M12 8.25V12l3 1.75"
        />
    </svg>
);

const CurrenciesList = () => {

    const [fromCurrency, setFromCurrency] = useState(null)
    const [toCurrency, setToCurrency] = useState(null)

    const [amount, setAmount] = useState("");
    const [hasConverted, setHasConverted] = useState(false);
    const [amountTouched, setAmountTouched] = useState(false);
    const [convertInvalidAttempt, setConvertInvalidAttempt] = useState(false);
    const [inputAdjustmentNotice, setInputAdjustmentNotice] = useState(false);
    const [fundModalOpen, setFundModalOpen] = useState(false);
    const [fundAuthNoticeVisible, setFundAuthNoticeVisible] = useState(false);
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

    const { logout, isAuthenticated } = useContext(AuthContext);

    useEffect(() => {
        if (isAuthenticated) setFundAuthNoticeVisible(false);
    }, [isAuthenticated]);

    const router = useRouter();

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

    const handleFundClick = () => {
        if (!isAuthenticated) {
            setFundAuthNoticeVisible(true);
            setFundModalOpen(false);
            return;
        }
        setFundAuthNoticeVisible(false);
        setFundModalOpen(true);
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

    const rateRefreshMetaLines = useMemo(() => {
        if (!fetchedAtLabel) return null;
        return {
            summary: relativeAgeLabel ? `Rates updated ${relativeAgeLabel}` : "Rates updated",
            dateLine: fetchedAtLabel,
        };
    }, [relativeAgeLabel, fetchedAtLabel]);

    const showRate = Boolean(showPair && !providerErrorMessage && !isLoading && formattedRate !== null);
    const showStaleIndicator = Boolean(showRate && isStale);

    const emptyStateMessage = useMemo(() => {
        if (fromCurrency && toCurrency) return null;
        if (!fromCurrency && !toCurrency) {
            return "Select both currencies.";
        }
        if (!fromCurrency) {
            return "Select a source currency.";
        }
        return "Select a target currency.";
    }, [fromCurrency, toCurrency]);

    const exchangeRateGroupAriaLabel = useMemo(() => {
        if (!showPair) {
            return emptyStateMessage
                ? `Exchange rate: ${emptyStateMessage}`
                : "Exchange rate";
        }
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
        emptyStateMessage,
    ]);

    const renderExchangeRatePanelBody = () => {
        if (!showPair) {
            return (
                <span
                    className={styles.exchangeRateEmpty}
                    role="status"
                    data-testid="exchange-rate-empty"
                >
                    {emptyStateMessage}
                </span>
            );
        }
        if (providerErrorMessage) {
            return <b className={styles.rateFigure}>—</b>;
        }
        if (isLoading) {
            return (
                <span
                    className={styles.rateLoading}
                    role="status"
                    aria-live="polite"
                    data-testid="exchange-rate-loading"
                >
                    <span className={styles.spinner} aria-hidden="true" />
                    <span>Loading exchange rate…</span>
                </span>
            );
        }
        if (formattedRate !== null) {
            return (
                <b className={styles.rateFigure}>
                    1 {fromCurrency.value} = {formattedRate} {toCurrency.value}
                </b>
            );
        }
        return (
            <span
                className={styles.rateUnavailable}
                role="status"
                data-testid="exchange-rate-unavailable"
            >
                <span>Rate unavailable for this pair.</span>
                <button
                    type="button"
                    className={styles.refreshRateButton}
                    onClick={retryRates}
                    disabled={isLoading}
                >
                    Try again
                </button>
            </span>
        );
    };

    return <Container>
        <div className={styles.listContainer}>
            {!isAuthenticated ? (
                <button
                    type="button"
                    className={styles.backToHome}
                    onClick={() => router.push("/")}
                    aria-label="Back to home page"
                >
                    ← Home
                </button>
            ) : (
                <nav className={styles.accountNav} aria-label="Account navigation">
                    <button
                        type="button"
                        className={styles.navLink}
                        onClick={() => router.push("/orders/new")}
                    >
                        Buy crypto with fiat
                    </button>
                    <span className={styles.navSep} aria-hidden="true">
                        ·
                    </span>
                    <button type="button" className={styles.navLink} onClick={handleLogout}>
                        Log out
                    </button>
                </nav>
            )}

            <Row className="justify-content-center">
                <Col lg={8} md={8} sm={10}>
                    <Headline size={2} character="!">
                        Discover Real-Time Currency Exchange Rates Now
                    </Headline>
                </Col>
            </Row>

            <Logo
                variant="app"
                onClick={() => router.push(isAuthenticated ? "/currencies" : "/")}
                ariaLabel={isAuthenticated ? "Go to fiat exchange rates (home)" : "Go to home page"}
            />

            <Row className="justify-content-center">

                <Col lg={5} md={5} sm={6}>
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

                <Col lg={5} md={5} sm={6}>
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

                <Col lg={5} md={5} sm={6} className={styles.inputWrapper}>
                    {showAmountHelperText ? (
                        <span id="amount-helper-text" className={styles.srOnly}>
                            {AMOUNT_FIELD_HELPER}
                        </span>
                    ) : null}
                    {showInputAdjustmentNotice ? (
                        <span
                            id="amount-adjustment-notice"
                            className={styles.srOnly}
                            role="status"
                            aria-live="polite"
                            aria-atomic="true"
                        >
                            {AMOUNT_INPUT_ADJUSTMENT_NOTICE}
                        </span>
                    ) : null}
                    <div className={styles.amountInputRow}>
                        {showAmountHelperText ? (
                            <div className={styles.amountInfoWrap}>
                                <button
                                    type="button"
                                    className={`${styles.amountInfoBtn}${showInputAdjustmentNotice ? ` ${styles.amountInfoBtnHighlight}` : ""}`}
                                    aria-label="Amount field help: open for formatting rules"
                                >
                                    <AmountInfoIcon />
                                </button>
                                <div
                                    id="amount-field-help-tooltip"
                                    role="tooltip"
                                    className={styles.amountInfoTooltip}
                                    data-testid="amount-info-tooltip"
                                >
                                    <p className={styles.tooltipParagraph}>{AMOUNT_FIELD_HELPER}</p>
                                    {showInputAdjustmentNotice ? (
                                        <p className={styles.tooltipAdjustment}>{AMOUNT_INPUT_ADJUSTMENT_NOTICE}</p>
                                    ) : null}
                                </div>
                            </div>
                        ) : null}
                        <div className={styles.amountField}>
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
                            {fromCurrency?.value ? (
                                <strong className={styles.amountCurrency} aria-hidden="true">
                                    {fromCurrency.value}
                                </strong>
                            ) : null}
                            <label htmlFor="conversion-amount" className={styles.srOnly}>Amount</label>
                            <input
                                id="conversion-amount"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                autoComplete="off"
                                placeholder="Amount"
                                className={styles.amountInput}
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
                        </div>
                    </div>
                </Col>


                <Col
                    lg={5}
                    md={5}
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

            <Row className={`justify-content-center ${styles.convertActionsRow}`}>
                <Col lg={showRate ? 5 : 10} md={showRate ? 5 : 10} sm={showRate ? 6 : 12}>
                    <div className={styles.convertPrimaryWrap}>
                        <button
                            type="button"
                            className={`${styles.convertSubmit} ${styles.convertRowButton}`}
                            onClick={onConvert}
                            disabled={isConvertDisabled}
                        >
                            {hasConverted && formattedConverted !== null
                                ? `${formattedConverted} ${toCurrency?.value ?? ""}`.trim()
                                : "Convert"}
                        </button>
                    </div>
                </Col>
                {showRate ? (
                    <Col lg={5} md={5} sm={6}>
                        <div className={styles.rateRefreshCluster}>
                            <div className={styles.rateRefreshToolbar}>
                                <button
                                    type="button"
                                    className={`${styles.convertSecondary} ${styles.convertRowButton} ${styles.rateRefreshAction}`}
                                    onClick={retryRates}
                                    disabled={isLoading}
                                    aria-label={
                                        showStaleIndicator
                                            ? "Refresh exchange rate. Stale rate snapshot."
                                            : "Refresh exchange rate"
                                    }
                                    data-testid="rate-refresh-action-button"
                                >
                                    <span className={styles.rateRefreshButtonInner}>
                                        {showStaleIndicator ? (
                                            <span
                                                className={styles.staleBadge}
                                                role="status"
                                                data-testid="stale-rate-badge"
                                            >
                                                Stale rate
                                            </span>
                                        ) : null}
                                        <span className={styles.rateRefreshPrimaryLabel}>
                                            {isLoading ? "Refreshing…" : "Refresh rate"}
                                        </span>
                                    </span>
                                </button>
                                {rateRefreshMetaLines ? (
                                    <div className={styles.rateMetaPopoverWrap}>
                                        <button
                                            type="button"
                                            className={styles.rateMetaTriggerBtn}
                                            aria-describedby="rate-refresh-meta-tooltip"
                                            aria-label="When exchange rates were last updated"
                                            data-testid="rate-refresh-meta-trigger"
                                        >
                                            <RateUpdateClockIcon />
                                        </button>
                                        <div
                                            id="rate-refresh-meta-tooltip"
                                            role="tooltip"
                                            className={styles.rateRefreshMetaPopover}
                                            data-testid="rate-refresh-meta-tooltip"
                                        >
                                            <span className={styles.rateRefreshMetaPopoverSummary}>
                                                {rateRefreshMetaLines.summary}
                                            </span>
                                            <span className={styles.rateRefreshMetaPopoverDate}>
                                                {rateRefreshMetaLines.dateLine}
                                            </span>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </Col>
                ) : null}
            </Row>

            {hasConverted &&
            formattedConverted !== null &&
            showPair &&
            !duplicateCurrencySelection &&
            !providerErrorMessage ? (
                <Row className={`justify-content-center ${styles.fundActionsRow}`}>
                    <Col xs={12} md={10} lg={8}>
                        <div className={styles.fundCtaWrap}>
                            <button
                                type="button"
                                className={styles.fundCtaBtn}
                                onClick={handleFundClick}
                            >
                                Buy / deposit
                            </button>
                            <p className={styles.fundCtaHint}>Fund your wallet with a card.</p>
                            {fundAuthNoticeVisible ? (
                                <div className={styles.fundAuthNotice} role="alert">
                                    <p className={styles.fundAuthNoticeText}>
                                        To pay by card and add funds, please log in or create an account first.
                                    </p>
                                    <div className={styles.fundAuthNoticeActions}>
                                        <button
                                            type="button"
                                            className={styles.fundAuthPrimaryBtn}
                                            onClick={() => router.push("/")}
                                        >
                                            Go to home — log in or register
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.fundAuthDismissBtn}
                                            onClick={() => setFundAuthNoticeVisible(false)}
                                        >
                                            Dismiss
                                        </button>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </Col>
                </Row>
            ) : null}
        </div>

        <FundFiatModal
            isOpen={fundModalOpen}
            onClose={() => setFundModalOpen(false)}
            fromCurrencyCode={fromCurrency?.value}
            toCurrencyCode={toCurrency?.value}
            amountLabel={
                fromCurrency?.value && amount !== ""
                    ? `${formatWholeAmountForDisplay(amount)} ${fromCurrency.value}`
                    : ""
            }
            convertedLabel={
                toCurrency?.value && formattedConverted !== null
                    ? `${formattedConverted} ${toCurrency.value}`
                    : ""
            }
        />
    </Container>;
};

export default CurrenciesList;
