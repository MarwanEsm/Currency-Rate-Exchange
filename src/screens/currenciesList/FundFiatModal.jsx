import React, { useEffect, useState } from "react";
import Modal from "@/components/layout/modal/Modal";
import styles from "./FundFiatModal.module.scss";

/**
 * Post–rate-check flow: add fiat via SEPA or card (UI shell; payment rails require backend/partner integration).
 */
const FundFiatModal = ({
    isOpen,
    onClose,
    fromCurrencyCode,
    toCurrencyCode,
    amountLabel,
    convertedLabel,
}) => {
    const [method, setMethod] = useState(null);

    useEffect(() => {
        if (!isOpen) setMethod(null);
    }, [isOpen]);

    if (!isOpen) return null;

    const pairSummary =
        fromCurrencyCode && toCurrencyCode
            ? `${fromCurrencyCode} → ${toCurrencyCode}`
            : "";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Buy or deposit fiat">
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

                {!method ? (
                    <>
                        <p className={styles.lead}>Choose how you want to add funds.</p>
                        <div className={styles.choiceGrid}>
                            <button
                                type="button"
                                className={styles.choiceCard}
                                onClick={() => setMethod("sepa")}
                            >
                                <span className={styles.choiceTitle}>SEPA transfer</span>
                                <span className={styles.choiceDesc}>
                                    Deposit euros via SEPA Credit Transfer (usually 1–2 business days).
                                </span>
                            </button>
                            <button
                                type="button"
                                className={styles.choiceCard}
                                onClick={() => setMethod("card")}
                            >
                                <span className={styles.choiceTitle}>Card</span>
                                <span className={styles.choiceDesc}>
                                    Pay with Visa, Mastercard, or other supported debit/credit cards.
                                </span>
                            </button>
                        </div>
                    </>
                ) : method === "sepa" ? (
                    <div className={styles.detail}>
                        <button type="button" className={styles.backBtn} onClick={() => setMethod(null)}>
                            ← Back
                        </button>
                        <h3 className={styles.detailTitle}>Deposit via SEPA</h3>
                        <p className={styles.detailText}>
                            Use a SEPA Credit Transfer in EUR from your bank. You’ll receive unique payment
                            instructions (IBAN, BIC, payment reference) after your payment profile is verified.
                        </p>
                        <div className={styles.callout}>
                            <strong>Typical settlement:</strong> 1–2 business days. Fees depend on your bank.
                        </div>
                        <p className={styles.placeholderNote}>
                            Integration placeholder — connect your banking / treasury provider to generate live IBAN
                            details and references.
                        </p>
                    </div>
                ) : (
                    <div className={styles.detail}>
                        <button type="button" className={styles.backBtn} onClick={() => setMethod(null)}>
                            ← Back
                        </button>
                        <h3 className={styles.detailTitle}>Pay by card</h3>
                        <p className={styles.detailText}>
                            Complete checkout with your card (3‑D Secure where required). Funds are authorised quickly;
                            settlement timing depends on your card network and issuer.
                        </p>
                        <div className={styles.callout}>
                            <strong>Note:</strong> card payments often include higher fees than bank transfers.
                        </div>
                        <p className={styles.placeholderNote}>
                            Integration placeholder — connect a PSP (e.g. Stripe, Adyen) for live card capture.
                        </p>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default FundFiatModal;
