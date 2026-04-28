/**
 * Fiat → crypto: guests may only check indicative rates; signed-in users can check rates and submit a buy request.
 */
import React, { useContext, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Container from "@/components/layout/container/Container";
import Headline from "@/components/elements/headline/Headline";
import { AuthContext } from "@/firebase/authContext";
import { KYC_VERIFICATION_STATUS } from "@/domain/fiatToCryptoCompliance";
import { FIAT_TO_CRYPTO_QUOTE_PREVIEW_FIATS } from "@/domain/fiatToCryptoQuotePreview";
import { ASSET_ALLOWED_TRANSFER_NETWORKS, CRYPTO_TRANSFER_NETWORK_ID, FIAT_TO_CRYPTO_MAJOR_TARGET_ASSETS } from "@/domain/fiatToCryptoTransfer";
import { validateFiatToCryptoIntakePayload } from "@/domain/fiatToCryptoIntake";
import styles from "./FiatToCryptoRequestForm.module.scss";

const NETWORK_LABELS = {
    [CRYPTO_TRANSFER_NETWORK_ID.BITCOIN_MAINNET]: "Bitcoin (mainnet)",
    [CRYPTO_TRANSFER_NETWORK_ID.ETHEREUM_MAINNET]: "Ethereum (mainnet)",
    [CRYPTO_TRANSFER_NETWORK_ID.SOLANA_MAINNET]: "Solana (mainnet)",
    [CRYPTO_TRANSFER_NETWORK_ID.LITECOIN_MAINNET]: "Litecoin (mainnet)",
    [CRYPTO_TRANSFER_NETWORK_ID.DOGECOIN_MAINNET]: "Dogecoin (mainnet)",
    [CRYPTO_TRANSFER_NETWORK_ID.RIPPLE_MAINNET]: "Ripple / XRPL",
    [CRYPTO_TRANSFER_NETWORK_ID.CARDANO_MAINNET]: "Cardano (mainnet)",
    [CRYPTO_TRANSFER_NETWORK_ID.COSMOS_FAMILY_MAINNET]: "Cosmos-family (mainnet)",
    [CRYPTO_TRANSFER_NETWORK_ID.POLKADOT_MAINNET]: "Polkadot",
    [CRYPTO_TRANSFER_NETWORK_ID.BITCOIN_CASH_MAINNET]: "Bitcoin Cash",
    [CRYPTO_TRANSFER_NETWORK_ID.NEAR_MAINNET]: "NEAR",
    [CRYPTO_TRANSFER_NETWORK_ID.FILECOIN_MAINNET]: "Filecoin",
    [CRYPTO_TRANSFER_NETWORK_ID.HEX64_ACCOUNT_MAINNET]: "Move-style L1 (hex account)",
    [CRYPTO_TRANSFER_NETWORK_ID.EOS_MAINNET]: "EOS",
    [CRYPTO_TRANSFER_NETWORK_ID.TEZOS_MAINNET]: "Tezos",
    [CRYPTO_TRANSFER_NETWORK_ID.STELLAR_MAINNET]: "Stellar",
    [CRYPTO_TRANSFER_NETWORK_ID.ZCASH_MAINNET]: "Zcash",
    [CRYPTO_TRANSFER_NETWORK_ID.HEDERA_MAINNET]: "Hedera",
    [CRYPTO_TRANSFER_NETWORK_ID.STACKS_MAINNET]: "Stacks",
    [CRYPTO_TRANSFER_NETWORK_ID.TON_MAINNET]: "TON",
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
    const [referenceCopied, setReferenceCopied] = useState(false);

    const [quoteLoading, setQuoteLoading] = useState(false);
    const [quoteError, setQuoteError] = useState(null);
    const [quoteResult, setQuoteResult] = useState(null);

    const networkOptions = useMemo(() => {
        const list = ASSET_ALLOWED_TRANSFER_NETWORKS[targetAssetCode] ?? [];
        return list.map((id) => ({ id, label: NETWORK_LABELS[id] ?? id }));
    }, [targetAssetCode]);

    const runClientValidation = () => {
        if (!user?.uid) {
            setClientErrors(["Please log in to submit a buy request."]);
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

    const handleCheckQuote = async () => {
        setQuoteError(null);
        setQuoteResult(null);
        setQuoteLoading(true);
        try {
            const params = new URLSearchParams({
                fiatCurrency,
                fiatAmount: fiatAmount.trim(),
                targetAssetCode,
            });
            const res = await fetch(`/api/fiat-to-crypto/quote-preview?${params.toString()}`);
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                const msg = Array.isArray(data.errors)
                    ? data.errors.join(" ")
                    : data.message || data.error || "Could not load quote.";
                setQuoteError(msg);
                return;
            }
            setQuoteResult(data);
        } catch {
            setQuoteError("Network error. Please try again.");
        } finally {
            setQuoteLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerErrors([]);
        setConfirmation(null);
        setReferenceCopied(false);
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
                <button
                    type="button"
                    className={styles.back}
                    onClick={() => router.push(isAuthenticated ? "/currencies" : "/")}
                    aria-label={isAuthenticated ? "Back to fiat exchange rates" : "Back to home page"}
                >
                    {isAuthenticated ? "← Fiat exchange rates" : "← Home"}
                </button>
                <Headline size={2} className={styles.pageTitle}>
                    Fiat-to-crypto
                </Headline>

                <p className={styles.lead}>
                    <strong>Before you log in:</strong> you can check rates only —{" "}
                    <Link href="/currencies" className={styles.inlineLink}>
                        fiat ↔ fiat
                    </Link>{" "}
                    on the currencies page, and <strong>fiat → crypto</strong> below. Buying and submitting a request
                    requires an account.
                </p>

                {isAuthenticated ? (
                    <p className={styles.lead}>
                        You are signed in: use the calculator below, then complete <strong>Buy crypto</strong> with your
                        wallet and network.
                    </p>
                ) : (
                    <p className={styles.info} role="status">
                        You are not signed in — rate check only. To buy, open the{" "}
                        <Link href="/" className={styles.inlineLink}>
                            home page
                        </Link>{" "}
                        and log in or register, then return here.
                    </p>
                )}

                <section className={styles.section} aria-labelledby="quote-heading">
                    <h2 id="quote-heading" className={styles.sectionTitle}>
                        {isAuthenticated ? "Check fiat → crypto rate" : "Fiat → crypto rate (check only)"}
                    </h2>
                    <p className={styles.hint}>
                        Indicative quote from live spot data and default fees — not binding.
                    </p>

                    <div className={styles.quoteRow}>
                        <label className={styles.field}>
                            <span>Fiat currency</span>
                            <select
                                className={styles.input}
                                value={fiatCurrency}
                                onChange={(e) => setFiatCurrency(e.target.value)}
                                aria-label="Fiat currency for quote"
                            >
                                {FIAT_TO_CRYPTO_QUOTE_PREVIEW_FIATS.map((c) => (
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
                                value={fiatAmount}
                                onChange={(e) => setFiatAmount(e.target.value)}
                                placeholder="e.g. 250.00"
                                aria-label="Fiat amount for quote"
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
                                aria-label="Crypto asset for quote"
                            >
                                {FIAT_TO_CRYPTO_MAJOR_TARGET_ASSETS.map((code) => (
                                    <option key={code} value={code}>
                                        {code}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <button
                        type="button"
                        className={styles.secondary}
                        onClick={handleCheckQuote}
                        disabled={quoteLoading || !fiatAmount.trim()}
                    >
                        {quoteLoading ? "Loading…" : "Check indicative quote"}
                    </button>

                    {quoteError && (
                        <p className={styles.quoteError} role="alert">
                            {quoteError}
                        </p>
                    )}

                    {quoteResult?.quote && (
                        <div className={styles.quoteBox} aria-live="polite">
                            <p className={styles.quoteDisclaimer}>{quoteResult.disclaimer}</p>
                            <p>
                                After estimated fees: <strong>{quoteResult.quote.netCryptoAmount}</strong>{" "}
                                {quoteResult.quote.netCryptoAssetCode} for{" "}
                                <strong>
                                    {quoteResult.fiatAmount} {quoteResult.fiatCurrency}
                                </strong>
                                .
                            </p>
                            <p className={styles.quoteMeta}>
                                Fee (est.): {quoteResult.quote.feeFiatAmount} {quoteResult.fiatCurrency} · Spot (crypto
                                per 1 fiat): {quoteResult.providerSpotCryptoPerFiat}
                            </p>
                        </div>
                    )}
                </section>

                {isAuthenticated ? (
                    <section className={styles.section} aria-labelledby="submit-heading">
                        <h2 id="submit-heading" className={styles.sectionTitle}>
                            Buy crypto (submit request)
                        </h2>
                        <p className={styles.hint}>
                            Uses the amounts and asset selected above. Our team receives the request in the admin inbox;
                            fulfillment continues outside this app.
                        </p>

                        <form className={styles.form} onSubmit={handleSubmit} noValidate>
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
                                        {displayErrors.map((err, i) => (
                                            <li key={`${i}:${err}`}>{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <button type="submit" className={styles.submit} disabled={submitting}>
                                {submitting ? "Submitting…" : "Submit buy request"}
                            </button>
                        </form>
                    </section>
                ) : null}

                {confirmation && (
                    <section className={styles.confirm} aria-live="polite" aria-label="Order confirmation">
                        <h2 className={styles.confirmTitle}>Request received</h2>
                        <p className={styles.refLabel}>
                            <strong>Request reference</strong> — save this for support and tracking:
                        </p>
                        <div className={styles.refRow}>
                            <code className={styles.ref} data-testid="order-reference">
                                {confirmation.id}
                            </code>
                            {typeof navigator !== "undefined" && navigator.clipboard?.writeText && (
                                <button
                                    type="button"
                                    className={styles.copyBtn}
                                    onClick={async () => {
                                        try {
                                            await navigator.clipboard.writeText(confirmation.id);
                                            setReferenceCopied(true);
                                            setTimeout(() => setReferenceCopied(false), 2500);
                                        } catch {
                                            /* ignore */
                                        }
                                    }}
                                >
                                    {referenceCopied ? "Copied" : "Copy"}
                                </button>
                            )}
                        </div>
                        <p className={styles.meta}>
                            Status: <strong>{confirmation.status}</strong> · {confirmation.targetAssetCode} ·{" "}
                            {confirmation.fiatAmount} {confirmation.fiatCurrency}
                        </p>
                        <p className={styles.afterSubmit}>
                            Keep this reference for your records. Our team will contact you or continue processing in
                            our operations systems — there is no live tracking page in this app.
                        </p>
                    </section>
                )}
            </div>
        </Container>
    );
};

export default FiatToCryptoRequestForm;
