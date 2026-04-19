import React, { useContext, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Container from "@/components/layout/container/Container";
import Headline from "@/components/elements/headline/Headline";
import { AuthContext } from "@/firebase/authContext";
import { KYC_VERIFICATION_STATUS } from "@/domain/fiatToCryptoCompliance";
import { ASSET_ALLOWED_TRANSFER_NETWORKS, CRYPTO_TRANSFER_NETWORK_ID } from "@/domain/fiatToCryptoTransfer";
import { validateFiatToCryptoIntakePayload } from "@/domain/fiatToCryptoIntake";
import styles from "./FiatToCryptoRequestForm.module.scss";

const FIAT_CURRENCIES = ["USD", "EUR"];

const NETWORK_LABELS = {
    [CRYPTO_TRANSFER_NETWORK_ID.BITCOIN_MAINNET]: "Bitcoin (mainnet)",
    [CRYPTO_TRANSFER_NETWORK_ID.ETHEREUM_MAINNET]: "Ethereum (mainnet)",
};

const FiatToCryptoRequestForm = () => {
    const router = useRouter();
    const { user, isAuthenticated } = useContext(AuthContext);

    const [fiatCurrency, setFiatCurrency] = useState("USD");
    const [fiatAmount, setFiatAmount] = useState("");
    const [targetAssetCode, setTargetAssetCode] = useState("BTC");
    const [network, setNetwork] = useState("");
    const [walletAddress, setWalletAddress] = useState("");
    const [kycVerificationStatus, setKycVerificationStatus] = useState(KYC_VERIFICATION_STATUS.VERIFIED);

    const [clientErrors, setClientErrors] = useState([]);
    const [serverErrors, setServerErrors] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [confirmation, setConfirmation] = useState(null);

    const networkOptions = useMemo(() => {
        const list = ASSET_ALLOWED_TRANSFER_NETWORKS[targetAssetCode] ?? [];
        return list.map((id) => ({ id, label: NETWORK_LABELS[id] ?? id }));
    }, [targetAssetCode]);

    const runClientValidation = () => {
        if (!user?.uid) {
            setClientErrors(["Please log in to submit a request."]);
            return null;
        }
        const body = {
            userId: user.uid,
            fiatCurrency,
            fiatAmount,
            targetAssetCode,
            walletAddress,
            network: network || undefined,
            kycVerificationStatus,
        };
        const r = validateFiatToCryptoIntakePayload(body);
        if (!r.ok) {
            setClientErrors(r.errors);
            return null;
        }
        setClientErrors([]);
        return body;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerErrors([]);
        setConfirmation(null);
        const body = runClientValidation();
        if (!body) return;

        setSubmitting(true);
        try {
            const res = await fetch("/api/fiat-to-crypto/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setServerErrors(Array.isArray(data.errors) ? data.errors : [data.error || "Request failed."]);
                return;
            }
            if (data.order?.id) {
                setConfirmation(data.order);
            }
        } catch {
            setServerErrors(["Network error. Please try again."]);
        } finally {
            setSubmitting(false);
        }
    };

    const displayErrors = [...clientErrors, ...serverErrors];

    return (
        <Container>
            <div className={styles.wrap}>
                <button type="button" className={styles.back} onClick={() => router.push("/")}>
                    ← Home
                </button>
                <Headline size={2}>Fiat-to-crypto request</Headline>
                <p className={styles.lead}>
                    Submit the amount, asset, network, and destination wallet. Your request is validated on this
                    device and again on the server before it is created in <strong>submitted</strong> status (FCX-25).
                </p>

                {!isAuthenticated && (
                    <p className={styles.warn} role="status">
                        Log in to attach this request to your account and enable submission.
                    </p>
                )}

                <form className={styles.form} onSubmit={handleSubmit} noValidate>
                    <label className={styles.field}>
                        <span>Fiat currency</span>
                        <select
                            className={styles.input}
                            value={fiatCurrency}
                            onChange={(e) => setFiatCurrency(e.target.value)}
                            aria-label="Fiat currency"
                        >
                            {FIAT_CURRENCIES.map((c) => (
                                <option key={c} value={c}>
                                    {c}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className={styles.field}>
                        <span>Fiat amount</span>
                        <input
                            className={styles.input}
                            type="text"
                            inputMode="decimal"
                            autoComplete="transaction-amount"
                            value={fiatAmount}
                            onChange={(e) => setFiatAmount(e.target.value)}
                            placeholder="e.g. 250.00"
                            aria-label="Fiat amount"
                            required
                        />
                    </label>

                    <label className={styles.field}>
                        <span>Crypto asset</span>
                        <select
                            className={styles.input}
                            value={targetAssetCode}
                            onChange={(e) => {
                                setTargetAssetCode(e.target.value);
                                setNetwork("");
                            }}
                            aria-label="Crypto asset"
                        >
                            {Object.keys(ASSET_ALLOWED_TRANSFER_NETWORKS).map((code) => (
                                <option key={code} value={code}>
                                    {code}
                                </option>
                            ))}
                        </select>
                    </label>

                    {networkOptions.length > 1 ? (
                        <label className={styles.field}>
                            <span>Network</span>
                            <select
                                className={styles.input}
                                value={network}
                                onChange={(e) => setNetwork(e.target.value)}
                                aria-label="Blockchain network"
                                required
                            >
                                <option value="">Select network</option>
                                {networkOptions.map((opt) => (
                                    <option key={opt.id} value={opt.id}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    ) : (
                        <p className={styles.hint}>
                            Network: {NETWORK_LABELS[networkOptions[0]?.id] ?? networkOptions[0]?.id} (applied
                            automatically for {targetAssetCode}).
                        </p>
                    )}

                    <label className={styles.field}>
                        <span>Destination wallet address</span>
                        <textarea
                            className={styles.textarea}
                            value={walletAddress}
                            onChange={(e) => setWalletAddress(e.target.value)}
                            rows={3}
                            placeholder="Paste the payout address for the selected asset and network"
                            aria-label="Destination wallet address"
                            required
                        />
                    </label>

                    <label className={styles.field}>
                        <span>Identity verification (demo)</span>
                        <select
                            className={styles.input}
                            value={kycVerificationStatus}
                            onChange={(e) => setKycVerificationStatus(e.target.value)}
                            aria-label="KYC verification status for demo"
                        >
                            <option value={KYC_VERIFICATION_STATUS.VERIFIED}>Verified (allowed)</option>
                            <option value={KYC_VERIFICATION_STATUS.PENDING}>Pending (blocked)</option>
                            <option value={KYC_VERIFICATION_STATUS.REJECTED}>Rejected (blocked)</option>
                        </select>
                    </label>

                    {displayErrors.length > 0 && (
                        <div className={styles.errors} role="alert">
                            <p className={styles.errorsTitle}>Please fix the following:</p>
                            <ul>
                                {displayErrors.map((err) => (
                                    <li key={err}>{err}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <button type="submit" className={styles.submit} disabled={submitting || !isAuthenticated}>
                        {submitting ? "Submitting…" : "Submit request"}
                    </button>
                </form>

                {confirmation && (
                    <section className={styles.confirm} aria-live="polite">
                        <h2 className={styles.confirmTitle}>Request received</h2>
                        <p>
                            Your reference is <code className={styles.ref}>{confirmation.id}</code>. Save this ID
                            for support and status tracking.
                        </p>
                        <p className={styles.meta}>
                            Status: <strong>{confirmation.status}</strong> · {confirmation.targetAssetCode} ·{" "}
                            {confirmation.fiatAmount} {confirmation.fiatCurrency}
                        </p>
                        <button type="button" className={styles.secondary} onClick={() => router.push("/orders/progress")}>
                            View status demo
                        </button>
                    </section>
                )}
            </div>
        </Container>
    );
};

export default FiatToCryptoRequestForm;
