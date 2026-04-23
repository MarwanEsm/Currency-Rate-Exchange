import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Container from "@/components/layout/container/Container";
import Headline from "@/components/elements/headline/Headline";
import { AuthContext } from "@/firebase/authContext";
import { ADMIN_ROLE, ADMIN_PERMISSION, hasAdminPermission } from "@/domain/adminPermissions";
import { ADMIN_DECISION } from "@/domain/fiatToCryptoAdminQueue";
import { DEFAULT_COMMISSION_CONFIG } from "@/domain/fiatToCryptoPricing";
import styles from "./AdminOrderQueueScreen.module.scss";

const ROLE_OPTIONS = Object.values(ADMIN_ROLE);

const buildAdminHeaders = (adminUserId, roles) => ({
    "Content-Type": "application/json",
    "x-admin-user-id": adminUserId,
    "x-admin-roles": roles.join(","),
});

const describeCommissionConfig = (config) => {
    if (!config) return "—";
    const parts = [];
    if (config.type === "fixed" || config.type === "hybrid") parts.push(`fixed ${config.fixedFiat}`);
    if (config.type === "percentage" || config.type === "hybrid")
        parts.push(`${(config.percentageBps / 100).toFixed(2)}%`);
    if (config.minFiat) parts.push(`min ${config.minFiat}`);
    if (config.maxFiat) parts.push(`max ${config.maxFiat}`);
    return parts.join(" + ") || config.type;
};

const AdminOrderQueueScreen = () => {
    const router = useRouter();
    const { user, isAuthenticated } = useContext(AuthContext);

    const [roles, setRoles] = useState([ADMIN_ROLE.ORDER_REVIEWER]);
    const [orders, setOrders] = useState([]);
    const [purchasingOrders, setPurchasingOrders] = useState([]);
    const [listError, setListError] = useState(null);
    const [loading, setLoading] = useState(false);

    const [activeOrderId, setActiveOrderId] = useState(null);
    const [reason, setReason] = useState("");
    const [decisionBusy, setDecisionBusy] = useState(false);
    const [decisionError, setDecisionError] = useState(null);
    const [decisionBanner, setDecisionBanner] = useState(null);

    const [exchangeRate, setExchangeRate] = useState("");
    const [quote, setQuote] = useState(null);
    const [quoteError, setQuoteError] = useState(null);
    const [quoteBusy, setQuoteBusy] = useState(false);

    const [executeBusyId, setExecuteBusyId] = useState(null);
    const [executeSimulatedOutcome, setExecuteSimulatedOutcome] = useState("");
    const [executeResultBanner, setExecuteResultBanner] = useState(null);
    const [executeError, setExecuteError] = useState(null);

    const canView = useMemo(() => hasAdminPermission(roles, ADMIN_PERMISSION.VIEW_ORDER_QUEUE), [roles]);
    const canDecide = useMemo(() => hasAdminPermission(roles, ADMIN_PERMISSION.DECIDE_ORDER_APPROVAL), [roles]);
    const canExecute = useMemo(() => hasAdminPermission(roles, ADMIN_PERMISSION.EXECUTE_PURCHASE), [roles]);

    const adminUserId = user?.uid ?? "";

    const toggleRole = (role) => {
        setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
    };

    const loadQueue = useCallback(async () => {
        if (!adminUserId || !canView) {
            setOrders([]);
            setPurchasingOrders([]);
            return;
        }
        setLoading(true);
        setListError(null);
        try {
            const [paidRes, purchasingRes] = await Promise.all([
                fetch("/api/fiat-to-crypto/admin/queue?status=paid", {
                    method: "GET",
                    headers: buildAdminHeaders(adminUserId, roles),
                }),
                fetch("/api/fiat-to-crypto/admin/queue?status=purchasing", {
                    method: "GET",
                    headers: buildAdminHeaders(adminUserId, roles),
                }),
            ]);
            const paidData = await paidRes.json().catch(() => ({}));
            const purchasingData = await purchasingRes.json().catch(() => ({}));
            if (!paidRes.ok || !purchasingRes.ok) {
                setListError(paidData.error || purchasingData.error || "Failed to load queue.");
                return;
            }
            setOrders(Array.isArray(paidData.orders) ? paidData.orders : []);
            setPurchasingOrders(Array.isArray(purchasingData.orders) ? purchasingData.orders : []);
        } catch {
            setListError("Network error. Please retry.");
        } finally {
            setLoading(false);
        }
    }, [adminUserId, canView, roles]);

    useEffect(() => {
        loadQueue();
    }, [loadQueue]);

    const resetDecisionPanel = () => {
        setQuote(null);
        setQuoteError(null);
        setExchangeRate("");
        setReason("");
        setDecisionError(null);
    };

    const fetchPreview = async (orderId) => {
        if (!orderId || !exchangeRate || !canView) return;
        setQuoteBusy(true);
        setQuoteError(null);
        try {
            const res = await fetch(`/api/fiat-to-crypto/admin/orders/${encodeURIComponent(orderId)}/pricing`, {
                method: "POST",
                headers: buildAdminHeaders(adminUserId, roles),
                body: JSON.stringify({ exchangeRate, commissionConfig: DEFAULT_COMMISSION_CONFIG }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setQuoteError(
                    data.message || (Array.isArray(data.messages) ? data.messages.join("; ") : data.error) || "Preview failed.",
                );
                setQuote(null);
                return;
            }
            setQuote(data.quote);
        } catch {
            setQuoteError("Network error. Please retry.");
        } finally {
            setQuoteBusy(false);
        }
    };

    const submitDecision = async (decision) => {
        if (!activeOrderId || !canDecide || reason.trim().length < 3) {
            setDecisionError("A reason of at least 3 characters is required.");
            return;
        }
        if (decision === ADMIN_DECISION.APPROVE && !exchangeRate) {
            setDecisionError("Enter an exchange rate (positive decimal) before approving.");
            return;
        }
        setDecisionBusy(true);
        setDecisionError(null);
        try {
            const payload = { decision, reason };
            if (decision === ADMIN_DECISION.APPROVE) {
                payload.exchangeRate = exchangeRate;
                payload.commissionConfig = DEFAULT_COMMISSION_CONFIG;
            }
            const res = await fetch(`/api/fiat-to-crypto/admin/orders/${encodeURIComponent(activeOrderId)}/decision`, {
                method: "POST",
                headers: buildAdminHeaders(adminUserId, roles),
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                const compliance = Array.isArray(data.complianceReasonCodes) ? ` (${data.complianceReasonCodes.join(", ")})` : "";
                const messages = Array.isArray(data.messages) ? ` — ${data.messages.join("; ")}` : "";
                setDecisionError((data.message || data.error || "Decision failed.") + compliance + messages);
                return;
            }
            setDecisionBanner({
                decision: data.decision,
                orderId: data.order?.id,
                newStatus: data.order?.status,
                netCryptoAmount: data.order?.netCryptoAmount,
                netCryptoAssetCode: data.order?.netCryptoAssetCode,
                feeFiatAmount: data.order?.feeFiatAmount,
                fiatCurrency: data.order?.fiatCurrency,
            });
            setActiveOrderId(null);
            resetDecisionPanel();
            await loadQueue();
        } catch {
            setDecisionError("Network error. Please retry.");
        } finally {
            setDecisionBusy(false);
        }
    };

    const executePurchase = async (orderId) => {
        if (!canExecute) return;
        setExecuteBusyId(orderId);
        setExecuteError(null);
        setExecuteResultBanner(null);
        try {
            const res = await fetch(
                `/api/fiat-to-crypto/admin/orders/${encodeURIComponent(orderId)}/execute-purchase`,
                {
                    method: "POST",
                    headers: buildAdminHeaders(adminUserId, roles),
                    body: JSON.stringify({
                        ...(executeSimulatedOutcome ? { simulatedOutcome: executeSimulatedOutcome } : {}),
                    }),
                },
            );
            const data = await res.json().catch(() => ({}));
            if (data.ok) {
                setExecuteResultBanner({
                    ok: true,
                    orderId: data.order?.id,
                    newStatus: data.order?.status,
                    fillPrice: data.result?.fillPrice,
                    fillQuantity: data.result?.fillQuantity,
                    filledAssetCode: data.result?.filledAssetCode,
                    providerId: data.result?.providerId,
                    attempts: data.result?.attempts,
                });
            } else {
                setExecuteResultBanner({
                    ok: false,
                    orderId: data.order?.id ?? orderId,
                    newStatus: data.order?.status,
                    errorCode: data.result?.errorCode,
                    attempts: data.result?.attempts,
                });
                setExecuteError(data.result?.errorMessage || data.error || "Execution failed.");
            }
            await loadQueue();
        } catch {
            setExecuteError("Network error. Please retry.");
        } finally {
            setExecuteBusyId(null);
        }
    };

    return (
        <Container>
            <div className={styles.wrap}>
                <div className={styles.topNav}>
                    <button type="button" className={styles.link} onClick={() => router.push("/")}>
                        ← Home
                    </button>
                    <button type="button" className={styles.link} onClick={() => router.push("/admin/deposits")}>
                        Deposit reconciliation →
                    </button>
                    <button type="button" className={styles.link} onClick={loadQueue} disabled={loading}>
                        {loading ? "Refreshing…" : "Refresh"}
                    </button>
                </div>

                <Headline size={2}>Admin: pending approvals</Headline>
                <p className={styles.lead}>
                    Lists fiat-to-crypto orders in <strong>paid</strong> awaiting review (FCX-26). Preview the
                    commission &amp; net-crypto quote (FCX-22) before approving; rejecting marks the order{" "}
                    <strong>failed</strong> with your reason.
                </p>

                {!isAuthenticated && (
                    <p className={styles.warn} role="status">
                        Log in to act as an admin user (your Firebase UID is the `adminUserId` sent with every call).
                    </p>
                )}

                <section className={styles.section} aria-labelledby="roles-heading">
                    <h2 id="roles-heading" className={styles.sectionTitle}>
                        Demo roles
                    </h2>
                    <p className={styles.hint}>
                        Select at least one role with the required permission. Production should read roles from a
                        trusted server-side store, not the browser.
                    </p>
                    <div className={styles.rolePills}>
                        {ROLE_OPTIONS.map((role) => {
                            const active = roles.includes(role);
                            return (
                                <button
                                    key={role}
                                    type="button"
                                    className={active ? styles.rolePillActive : styles.rolePill}
                                    onClick={() => toggleRole(role)}
                                    aria-pressed={active}
                                >
                                    {role}
                                </button>
                            );
                        })}
                    </div>
                    <p className={styles.permSummary}>
                        View: <strong>{canView ? "yes" : "no"}</strong> · Decide:{" "}
                        <strong>{canDecide ? "yes" : "no"}</strong> · Execute purchase:{" "}
                        <strong>{canExecute ? "yes" : "no"}</strong>
                    </p>
                </section>

                {decisionBanner && (
                    <div className={styles.banner} role="status">
                        Decision <strong>{decisionBanner.decision}</strong> applied to order{" "}
                        <code className={styles.code}>{decisionBanner.orderId}</code> — now{" "}
                        <strong>{decisionBanner.newStatus}</strong>
                        {decisionBanner.netCryptoAmount ? (
                            <>
                                {" "}· net payout{" "}
                                <strong>
                                    {decisionBanner.netCryptoAmount} {decisionBanner.netCryptoAssetCode}
                                </strong>{" "}
                                (fee {decisionBanner.feeFiatAmount} {decisionBanner.fiatCurrency}).
                            </>
                        ) : (
                            "."
                        )}
                    </div>
                )}

                <section className={styles.section} aria-labelledby="queue-heading">
                    <h2 id="queue-heading" className={styles.sectionTitle}>
                        Queue
                    </h2>
                    {listError && (
                        <p className={styles.error} role="alert">
                            {listError}
                        </p>
                    )}
                    {!canView ? (
                        <p className={styles.hint}>Your selected roles don’t allow viewing the queue.</p>
                    ) : orders.length === 0 ? (
                        <p className={styles.hint}>No paid orders are waiting for review.</p>
                    ) : (
                        <ul className={styles.list}>
                            {orders.map((order) => {
                                const isActive = activeOrderId === order.id;
                                const persistedQuote =
                                    order.netCryptoAmount && order.feeFiatAmount
                                        ? `${order.netFiatAmount} ${order.fiatCurrency} net (fee ${order.feeFiatAmount}) → ${order.netCryptoAmount} ${order.netCryptoAssetCode} @ ${order.exchangeRateApplied}`
                                        : null;
                                return (
                                    <li key={order.id} className={styles.orderCard}>
                                        <div className={styles.orderHead}>
                                            <span className={styles.orderAmount}>
                                                {order.fiatAmount} {order.fiatCurrency} → {order.targetAssetCode}
                                            </span>
                                            <code className={styles.code}>{order.id}</code>
                                        </div>
                                        <div className={styles.orderMeta}>
                                            <span>User: {order.userId}</span>
                                            <span>Network: {order.network ?? "auto"}</span>
                                            <span>Submitted: {order.submittedAt ?? order.createdAt}</span>
                                        </div>
                                        {persistedQuote && (
                                            <p className={styles.quoteLine}>
                                                <span className={styles.quoteLabel}>Quote on file:</span>{" "}
                                                {persistedQuote}
                                            </p>
                                        )}
                                        <div className={styles.orderActions}>
                                            <button
                                                type="button"
                                                className={styles.secondary}
                                                disabled={!canDecide}
                                                onClick={() => {
                                                    if (isActive) {
                                                        setActiveOrderId(null);
                                                        resetDecisionPanel();
                                                    } else {
                                                        setActiveOrderId(order.id);
                                                        resetDecisionPanel();
                                                    }
                                                }}
                                            >
                                                {isActive ? "Cancel" : "Decide…"}
                                            </button>
                                        </div>
                                        {isActive && (
                                            <div className={styles.decisionPane}>
                                                <div className={styles.pricingBlock}>
                                                    <label className={styles.field}>
                                                        <span>
                                                            Exchange rate ({order.targetAssetCode} per 1{" "}
                                                            {order.fiatCurrency})
                                                        </span>
                                                        <input
                                                            type="text"
                                                            inputMode="decimal"
                                                            className={styles.input}
                                                            value={exchangeRate}
                                                            onChange={(e) => setExchangeRate(e.target.value)}
                                                            placeholder="e.g. 0.00002"
                                                            aria-label="Exchange rate"
                                                        />
                                                    </label>
                                                    <p className={styles.hint}>
                                                        Commission: {describeCommissionConfig(DEFAULT_COMMISSION_CONFIG)}
                                                    </p>
                                                    <div className={styles.previewButtons}>
                                                        <button
                                                            type="button"
                                                            className={styles.secondary}
                                                            onClick={() => fetchPreview(order.id)}
                                                            disabled={quoteBusy || !exchangeRate}
                                                        >
                                                            {quoteBusy ? "Previewing…" : "Preview pricing"}
                                                        </button>
                                                    </div>
                                                    {quoteError && (
                                                        <p className={styles.error} role="alert">
                                                            {quoteError}
                                                        </p>
                                                    )}
                                                    {quote && (
                                                        <dl className={styles.quoteGrid}>
                                                            <dt>Gross</dt>
                                                            <dd>
                                                                {quote.grossFiatAmount} {quote.fiatCurrency}
                                                            </dd>
                                                            <dt>Fee</dt>
                                                            <dd>
                                                                {quote.feeFiatAmount} {quote.fiatCurrency}
                                                            </dd>
                                                            <dt>Net fiat</dt>
                                                            <dd>
                                                                {quote.netFiatAmount} {quote.fiatCurrency}
                                                            </dd>
                                                            <dt>Net crypto</dt>
                                                            <dd>
                                                                {quote.netCryptoAmount} {quote.netCryptoAssetCode}
                                                            </dd>
                                                            {quote.warnings?.length > 0 && (
                                                                <>
                                                                    <dt>Warnings</dt>
                                                                    <dd>{quote.warnings.join(", ")}</dd>
                                                                </>
                                                            )}
                                                        </dl>
                                                    )}
                                                </div>

                                                <label className={styles.field}>
                                                    <span>Reason (required, 3–500 characters)</span>
                                                    <textarea
                                                        className={styles.textarea}
                                                        value={reason}
                                                        onChange={(e) => setReason(e.target.value)}
                                                        rows={3}
                                                        maxLength={500}
                                                        aria-label="Decision reason"
                                                    />
                                                </label>
                                                {decisionError && (
                                                    <p className={styles.error} role="alert">
                                                        {decisionError}
                                                    </p>
                                                )}
                                                <div className={styles.decisionButtons}>
                                                    <button
                                                        type="button"
                                                        className={styles.approve}
                                                        onClick={() => submitDecision(ADMIN_DECISION.APPROVE)}
                                                        disabled={decisionBusy}
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={styles.reject}
                                                        onClick={() => submitDecision(ADMIN_DECISION.REJECT)}
                                                        disabled={decisionBusy}
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>

                {executeResultBanner && (
                    <div
                        className={executeResultBanner.ok ? styles.banner : styles.errorBanner}
                        role="status"
                    >
                        Execution{" "}
                        <strong>{executeResultBanner.ok ? "succeeded" : "failed"}</strong> for order{" "}
                        <code className={styles.code}>{executeResultBanner.orderId}</code>{" "}
                        ({executeResultBanner.attempts ?? 0} attempt
                        {executeResultBanner.attempts === 1 ? "" : "s"}
                        {executeResultBanner.providerId ? ` · ${executeResultBanner.providerId}` : ""})
                        {executeResultBanner.ok ? (
                            <>
                                {" "}· filled{" "}
                                <strong>
                                    {executeResultBanner.fillQuantity} {executeResultBanner.filledAssetCode}
                                </strong>{" "}
                                @ <strong>{executeResultBanner.fillPrice}</strong> — now{" "}
                                <strong>{executeResultBanner.newStatus}</strong>.
                            </>
                        ) : (
                            <>
                                {" "}· {executeResultBanner.errorCode ?? "unknown_error"} — now{" "}
                                <strong>{executeResultBanner.newStatus ?? "failed"}</strong>.
                            </>
                        )}
                    </div>
                )}

                <section className={styles.section} aria-labelledby="execute-heading">
                    <h2 id="execute-heading" className={styles.sectionTitle}>
                        Purchase execution (approved orders)
                    </h2>
                    <p className={styles.hint}>
                        Orders in <strong>purchasing</strong> are ready for the liquidity provider. Execution
                        retries transient errors up to 3 times and writes fill metadata + audit entries before
                        moving the order to <strong>transferring</strong> (FCX-24). Use the simulated outcome to
                        test failure paths in the demo provider.
                    </p>
                    <label className={styles.field}>
                        <span>Simulated outcome (demo)</span>
                        <select
                            className={styles.input}
                            value={executeSimulatedOutcome}
                            onChange={(e) => setExecuteSimulatedOutcome(e.target.value)}
                            aria-label="Simulated outcome"
                        >
                            <option value="">success (default)</option>
                            <option value="timeout">timeout (retryable)</option>
                            <option value="insufficient_liquidity">insufficient_liquidity (retryable)</option>
                            <option value="network_error">network_error (retryable)</option>
                            <option value="rate_rejected">rate_rejected (non-retryable)</option>
                        </select>
                    </label>
                    {executeError && (
                        <p className={styles.error} role="alert">
                            {executeError}
                        </p>
                    )}
                    {!canView ? (
                        <p className={styles.hint}>Your selected roles don’t allow viewing the queue.</p>
                    ) : purchasingOrders.length === 0 ? (
                        <p className={styles.hint}>No orders are currently in purchasing.</p>
                    ) : (
                        <ul className={styles.list}>
                            {purchasingOrders.map((order) => (
                                <li key={order.id} className={styles.orderCard}>
                                    <div className={styles.orderHead}>
                                        <span className={styles.orderAmount}>
                                            {order.netCryptoAmount ?? order.fiatAmount}{" "}
                                            {order.netCryptoAssetCode ?? order.targetAssetCode} · from{" "}
                                            {order.fiatAmount} {order.fiatCurrency}
                                        </span>
                                        <code className={styles.code}>{order.id}</code>
                                    </div>
                                    <div className={styles.orderMeta}>
                                        <span>Rate locked: {order.exchangeRateApplied ?? "—"}</span>
                                        <span>Fee: {order.feeFiatAmount ?? "—"} {order.fiatCurrency}</span>
                                        <span>Attempts: {order.executionAttempts ?? 0}</span>
                                    </div>
                                    <div className={styles.orderActions}>
                                        <button
                                            type="button"
                                            className={styles.approve}
                                            disabled={!canExecute || executeBusyId === order.id}
                                            onClick={() => executePurchase(order.id)}
                                        >
                                            {executeBusyId === order.id ? "Executing…" : "Execute purchase"}
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </Container>
    );
};

export default AdminOrderQueueScreen;
