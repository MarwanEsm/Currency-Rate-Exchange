import React, { useEffect, useMemo, useState } from "react";
import Modal from "@/components/layout/modal/Modal";
import styles from "./FundFiatModal.module.scss";

const STEP = {
    REVIEW: "review",
    CHECKOUT: "checkout",
};

/**
 * Hosted Stripe Checkout — card capture happens on Stripe’s domain (PCI-safe).
 */
const FundFiatModal = ({
    isOpen,
    onClose,
    fromCurrencyCode,
    toCurrencyCode,
    amountLabel,
    convertedLabel,
    paymentCurrencyCode,
    paymentAmountWhole,
    pairLabel,
}) => {
    const [step, setStep] = useState(STEP.REVIEW);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [checkoutError, setCheckoutError] = useState(null);

    useEffect(() => {
        if (!isOpen) {
            setStep(STEP.REVIEW);
            setCheckoutLoading(false);
            setCheckoutError(null);
        }
    }, [isOpen]);

    const pairSummary = useMemo(() => {
        if (!fromCurrencyCode || !toCurrencyCode) return "";
        return `${fromCurrencyCode} → ${toCurrencyCode}`;
    }, [fromCurrencyCode, toCurrencyCode]);

    const paymentReady = useMemo(() => {
        const cur = String(paymentCurrencyCode ?? "").trim().toUpperCase();
        return /^[A-Z]{3}$/.test(cur) && Number.isFinite(paymentAmountWhole) && paymentAmountWhole > 0;
    }, [paymentCurrencyCode, paymentAmountWhole]);

    const handleStripeCheckout = async () => {
        setCheckoutError(null);
        if (!paymentReady) {
            setCheckoutError("Enter an amount and choose currencies before paying.");
            return;
        }
        setCheckoutLoading(true);
        try {
            const res = await fetch("/api/stripe/create-checkout-session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currency: paymentCurrencyCode.trim().toUpperCase(),
                    amountWhole: paymentAmountWhole,
                    pairLabel: pairLabel || pairSummary || "",
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                const msg =
                    typeof data.message === "string"
                        ? data.message
                        : typeof data.error === "string"
                          ? data.error
                          : "Could not start checkout.";
                throw new Error(msg);
            }
            if (typeof data.url !== "string" || !data.url) {
                throw new Error("Invalid checkout response.");
            }
            window.location.href = data.url;
        } catch (e) {
            setCheckoutError(e && typeof e === "object" && "message" in e ? String(e.message) : "Checkout failed.");
        } finally {
            setCheckoutLoading(false);
        }
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
                            Pay securely with{" "}
                            <strong>Stripe Checkout</strong> — cards (Visa, Mastercard, etc.), Apple Pay / Google Pay
                            where enabled, and strong customer authentication (PSD2 / 3‑D Secure) handled by Stripe.
                        </p>
                        <div className={styles.callout}>
                            Recommended for Germany/EU: charges settle through Stripe; enable EUR and connect your Stripe
                            account in the Dashboard. Use test keys (<code className={styles.code}>sk_test_…</code>)
                            until you go live.
                        </div>
                        <div className={styles.primaryAction}>
                            <button type="button" className={styles.continueBtn} onClick={() => setStep(STEP.CHECKOUT)}>
                                Continue
                            </button>
                        </div>
                    </>
                ) : null}

                {step === STEP.CHECKOUT ? (
                    <div className={styles.cardStep}>
                        <button type="button" className={styles.backBtn} onClick={() => setStep(STEP.REVIEW)}>
                            ← Back
                        </button>
                        <h3 className={styles.detailTitle}>Stripe Checkout</h3>
                        <p className={styles.detailText}>
                            You’ll leave this site briefly to enter payment details on Stripe’s hosted page.
                            Your card details never touch our servers.
                        </p>
                        {!paymentReady ? (
                            <p className={styles.formError} role="status">
                                Cannot charge: invalid amount or currency. Complete your conversion above first.
                            </p>
                        ) : null}
                        {checkoutError ? (
                            <p className={styles.formError} role="alert">
                                {checkoutError}
                            </p>
                        ) : null}
                        <div className={styles.primaryAction}>
                            <button
                                type="button"
                                className={styles.payBtn}
                                onClick={handleStripeCheckout}
                                disabled={checkoutLoading || !paymentReady}
                            >
                                {checkoutLoading ? "Redirecting…" : "Continue to Stripe Checkout"}
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>
        </Modal>
    );
};

export default FundFiatModal;
