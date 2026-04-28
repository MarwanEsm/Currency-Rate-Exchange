import React, { useEffect, useMemo, useState } from "react";
import Modal from "@/components/layout/modal/Modal";
import styles from "./FundFiatModal.module.scss";

const STEP = {
    REVIEW: "review",
    CARD: "card",
    DONE: "done",
};

const digitsOnly = (s) => String(s ?? "").replace(/\D/g, "");

/** Groups card digits as 4×4×4×4 for display only (demo UI — production uses PSP-hosted fields). */
const formatCardGroups = (raw) => {
    const d = digitsOnly(raw).slice(0, 16);
    const parts = [];
    for (let i = 0; i < d.length; i += 4) parts.push(d.slice(i, i + 4));
    return parts.join(" ").trim();
};

/**
 * Card-only fiat top-up flow (demo UI). Production should use Stripe Checkout, Stripe Elements,
 * or another PCI-compliant PSP — never submit raw PAN to your own API without certification.
 */
const FundFiatModal = ({
    isOpen,
    onClose,
    fromCurrencyCode,
    toCurrencyCode,
    amountLabel,
    convertedLabel,
}) => {
    const [step, setStep] = useState(STEP.REVIEW);
    const [cardholderName, setCardholderName] = useState("");
    const [cardNumberDigits, setCardNumberDigits] = useState("");
    const [expiry, setExpiry] = useState("");
    const [cvc, setCvc] = useState("");
    const [formError, setFormError] = useState(null);

    useEffect(() => {
        if (!isOpen) {
            setStep(STEP.REVIEW);
            setCardholderName("");
            setCardNumberDigits("");
            setExpiry("");
            setCvc("");
            setFormError(null);
        }
    }, [isOpen]);

    const pairSummary = useMemo(() => {
        if (!fromCurrencyCode || !toCurrencyCode) return "";
        return `${fromCurrencyCode} → ${toCurrencyCode}`;
    }, [fromCurrencyCode, toCurrencyCode]);

    const cardDisplayValue = formatCardGroups(cardNumberDigits);

    const handleCardNumberChange = (e) => {
        setCardNumberDigits(digitsOnly(e.target.value).slice(0, 16));
    };

    const handleExpiryChange = (e) => {
        let d = digitsOnly(e.target.value).slice(0, 4);
        if (d.length >= 2) d = `${d.slice(0, 2)}/${d.slice(2)}`;
        setExpiry(d);
    };

    const handleCvcChange = (e) => {
        setCvc(digitsOnly(e.target.value).slice(0, 4));
    };

    const validateCardStep = () => {
        const nameOk = cardholderName.trim().length >= 2;
        const panOk = cardNumberDigits.length >= 13;
        const expOk = /^\d{2}\/\d{2}$/.test(expiry);
        const cvcOk = cvc.length >= 3;
        if (!nameOk || !panOk || !expOk || !cvcOk) {
            setFormError("Please enter cardholder name, a valid card number, expiry (MM/YY), and security code.");
            return false;
        }
        setFormError(null);
        return true;
    };

    const handlePayClick = () => {
        if (!validateCardStep()) return;
        setStep(STEP.DONE);
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Pay by card">
            <div className={styles.body}>
                {(amountLabel || convertedLabel) && (
                    <p className={styles.context} role="status">
                        {pairSummary ? (
                            <>
                                <span className={styles.contextPair}>{pairSummary}</span>
                                {" · "}
                            </>
                        ) : null}
                        {amountLabel ? (
                            <>
                                Amount: <strong>{amountLabel}</strong>
                            </>
                        ) : null}
                        {convertedLabel ? (
                            <>
                                {amountLabel ? " · " : null}
                                Converted: <strong>{convertedLabel}</strong>
                            </>
                        ) : null}
                    </p>
                )}

                {step === STEP.REVIEW ? (
                    <>
                        <p className={styles.lead}>
                            Pay with a debit or credit card (Visa, Mastercard, and other supported brands). You may be
                            asked to confirm with your bank (3‑D Secure).
                        </p>
                        <div className={styles.callout}>
                            <strong>Demo flow:</strong> the next step collects card details in the browser for layout
                            only. In production, use your PSP’s hosted checkout or tokenisation — never raw card data on
                            your server without PCI compliance.
                        </div>
                        <div className={styles.primaryAction}>
                            <button type="button" className={styles.continueBtn} onClick={() => setStep(STEP.CARD)}>
                                Continue to card details
                            </button>
                        </div>
                    </>
                ) : null}

                {step === STEP.CARD ? (
                    <div className={styles.cardStep}>
                        <button type="button" className={styles.backBtn} onClick={() => setStep(STEP.REVIEW)}>
                            ← Back
                        </button>
                        <h3 className={styles.detailTitle}>Card details</h3>
                        <p className={styles.pciNote}>
                            For testing UI only — integrate Stripe Checkout / Elements before accepting real payments.
                        </p>

                        <div className={styles.form}>
                            <label className={styles.field}>
                                <span>Name on card</span>
                                <input
                                    type="text"
                                    className={styles.input}
                                    autoComplete="cc-name"
                                    value={cardholderName}
                                    onChange={(e) => setCardholderName(e.target.value)}
                                    placeholder="As shown on card"
                                />
                            </label>
                            <label className={styles.field}>
                                <span>Card number</span>
                                <input
                                    type="text"
                                    className={styles.input}
                                    inputMode="numeric"
                                    autoComplete="cc-number"
                                    value={cardDisplayValue}
                                    onChange={handleCardNumberChange}
                                    placeholder="0000 0000 0000 0000"
                                />
                            </label>
                            <div className={styles.rowTwo}>
                                <label className={styles.field}>
                                    <span>Expires</span>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        inputMode="numeric"
                                        autoComplete="cc-exp"
                                        value={expiry}
                                        onChange={handleExpiryChange}
                                        placeholder="MM/YY"
                                    />
                                </label>
                                <label className={styles.field}>
                                    <span>Security code</span>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        inputMode="numeric"
                                        autoComplete="cc-csc"
                                        value={cvc}
                                        onChange={handleCvcChange}
                                        placeholder="CVC"
                                    />
                                </label>
                            </div>
                        </div>

                        {formError ? (
                            <p className={styles.formError} role="alert">
                                {formError}
                            </p>
                        ) : null}

                        <div className={styles.primaryAction}>
                            <button type="button" className={styles.payBtn} onClick={handlePayClick}>
                                Pay securely
                            </button>
                        </div>
                    </div>
                ) : null}

                {step === STEP.DONE ? (
                    <div className={styles.doneStep}>
                        <div className={styles.doneIcon} aria-hidden="true">
                            ✓
                        </div>
                        <h3 className={styles.detailTitle}>Payment authorised (demo)</h3>
                        <p className={styles.detailText}>
                            In production, your PSP would confirm the charge and fund your wallet. Connect Stripe,
                            Adyen, or similar to complete this step for real money.
                        </p>
                        <button type="button" className={styles.continueBtn} onClick={onClose}>
                            Close
                        </button>
                    </div>
                ) : null}
            </div>
        </Modal>
    );
};

export default FundFiatModal;
