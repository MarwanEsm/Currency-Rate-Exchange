/**
 * Operations UI for fiat deposit verification & reconciliation (FCX-41). Domain engine: FCX-23.
 */
import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Container from "@/components/layout/container/Container";
import Headline from "@/components/elements/headline/Headline";
import { AuthContext } from "@/firebase/authContext";
import { COMPLIANCE_CHECK_STATUS } from "@/domain/fiatToCryptoCompliance";
import { ADMIN_ROLE, ADMIN_PERMISSION, hasAdminPermission } from "@/domain/adminPermissions";
import { DEPOSIT_RECONCILIATION_OUTCOME } from "@/domain/fiatToCryptoDeposit";
import styles from "./AdminDepositReconciliationScreen.module.scss";

const ROLE_OPTIONS = Object.values(ADMIN_ROLE);

const buildAdminHeaders = (adminUserId, roles) => ({
    "Content-Type": "application/json",
    "x-admin-user-id": adminUserId,
    "x-admin-roles": roles.join(","),
});

const outcomeLabel = (outcome) => {
    switch (outcome) {
        case DEPOSIT_RECONCILIATION_OUTCOME.MATCHED:
            return "Matched — order moved to paid";
        case DEPOSIT_RECONCILIATION_OUTCOME.AMOUNT_UNDER:
            return "Amount under — held for review";
        case DEPOSIT_RECONCILIATION_OUTCOME.AMOUNT_OVER:
            return "Amount over — held for review";
        case DEPOSIT_RECONCILIATION_OUTCOME.CURRENCY_MISMATCH:
            return "Currency mismatch — held for review";
        case DEPOSIT_RECONCILIATION_OUTCOME.NO_MATCHING_ORDER:
            return "No matching order — parked in suspense";
        case DEPOSIT_RECONCILIATION_OUTCOME.ORDER_NOT_ELIGIBLE:
            return "Order not eligible — already past submitted";
        case DEPOSIT_RECONCILIATION_OUTCOME.DUPLICATE_DEPOSIT:
            return "Duplicate deposit — already reconciled";
        default:
            return outcome ?? "unknown";
    }
};

const AdminDepositReconciliationScreen = () => {
    const router = useRouter();
    const { user, isAuthenticated } = useContext(AuthContext);

    const [roles, setRoles] = useState([ADMIN_ROLE.OPERATIONS_MANAGER]);
    const [deposit, setDeposit] = useState({
        id: "",
        amount: "",
        currency: "USD",
        reference: "",
        receivedAt: "",
        processor: "",
    });
    const [orderIdOverride, setOrderIdOverride] = useState("");
    const [notes, setNotes] = useState("");
    const [toleranceBps, setToleranceBps] = useState("0");
    const [amlCheckStatus, setAmlCheckStatus] = useState(COMPLIANCE_CHECK_STATUS.CLEARED);
    const [sanctionsCheckStatus, setSanctionsCheckStatus] = useState(COMPLIANCE_CHECK_STATUS.CLEARED);

    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [lastResult, setLastResult] = useState(null);

    const [events, setEvents] = useState([]);
    const [logError, setLogError] = useState(null);
    const [logLoading, setLogLoading] = useState(false);

    const [submittedOrders, setSubmittedOrders] = useState([]);
    const [submittedLoading, setSubmittedLoading] = useState(false);
    const [submittedError, setSubmittedError] = useState(null);

    const canView = useMemo(() => hasAdminPermission(roles, ADMIN_PERMISSION.VIEW_ORDER_QUEUE), [roles]);
    const canReconcile = useMemo(() => hasAdminPermission(roles, ADMIN_PERMISSION.RECONCILE_DEPOSIT), [roles]);

    const adminUserId = user?.uid ?? "";

    const toggleRole = (role) => {
        setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
    };

    const setDepositField = (key) => (e) => setDeposit((prev) => ({ ...prev, [key]: e.target.value }));

    const loadLog = useCallback(async () => {
        if (!adminUserId || !canView) {
            setEvents([]);
            return;
        }
        setLogLoading(true);
        setLogError(null);
        try {
            const res = await fetch("/api/fiat-to-crypto/admin/deposits/log", {
                method: "GET",
                headers: buildAdminHeaders(adminUserId, roles),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setLogError(data.error || "Failed to load log.");
                return;
            }
            setEvents(Array.isArray(data.events) ? [...data.events].reverse() : []);
        } catch {
            setLogError("Network error. Please retry.");
        } finally {
            setLogLoading(false);
        }
    }, [adminUserId, canView, roles]);

    const loadSubmittedOrders = useCallback(async () => {
        if (!adminUserId || !canView) {
            setSubmittedOrders([]);
            return;
        }
        setSubmittedLoading(true);
        setSubmittedError(null);
        try {
            const res = await fetch("/api/fiat-to-crypto/admin/queue?status=submitted", {
                method: "GET",
                headers: buildAdminHeaders(adminUserId, roles),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setSubmittedError(data.error || "Failed to load submitted orders.");
                return;
            }
            setSubmittedOrders(Array.isArray(data.orders) ? data.orders : []);
        } catch {
            setSubmittedError("Network error. Please retry.");
        } finally {
            setSubmittedLoading(false);
        }
    }, [adminUserId, canView, roles]);

    useEffect(() => {
        loadLog();
        loadSubmittedOrders();
    }, [loadLog, loadSubmittedOrders]);

    const fillDemoValues = () => {
        setDeposit({
            id: `dep_${Math.random().toString(36).slice(2, 8)}`,
            amount: "100.00",
            currency: "USD",
            reference: "",
            receivedAt: new Date().toISOString(),
            processor: "ACME_BANK",
        });
    };

    const submit = async () => {
        if (!canReconcile) return;
        setSubmitting(true);
        setSubmitError(null);
        setLastResult(null);
        try {
            const toleranceNum = Number.parseInt(toleranceBps, 10);
            const payload = {
                deposit: {
                    ...deposit,
                    amount: deposit.amount.trim(),
                    currency: deposit.currency.trim().toUpperCase(),
                    reference: deposit.reference.trim(),
                    id: deposit.id.trim(),
                    receivedAt: deposit.receivedAt.trim(),
                    processor: deposit.processor.trim() || undefined,
                },
                notes: notes.trim() || undefined,
                ...(orderIdOverride.trim() ? { orderId: orderIdOverride.trim() } : {}),
                ...(Number.isFinite(toleranceNum) && toleranceNum >= 0 ? { toleranceBps: toleranceNum } : {}),
                complianceScreening: {
                    amlCheckStatus,
                    sanctionsCheckStatus,
                },
            };
            const res = await fetch("/api/fiat-to-crypto/admin/deposits/reconcile", {
                method: "POST",
                headers: buildAdminHeaders(adminUserId, roles),
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => ({}));
            if (res.status === 400) {
                setSubmitError(
                    data.details ? data.details.join(" · ") : data.error || "Request rejected.",
                );
            } else if (res.status === 403) {
                setSubmitError("Forbidden — pick a role with the reconcile_deposit permission.");
            } else {
                setLastResult({
                    ok: Boolean(data.ok),
                    outcome: data.outcome,
                    event: data.event,
                    order: data.order,
                });
            }
            await loadLog();
            await loadSubmittedOrders();
        } catch {
            setSubmitError("Network error. Please retry.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Container>
            <div className={styles.wrap}>
                <div className={styles.topNav}>
                    <button type="button" className={styles.link} onClick={() => router.push("/")}>
                        ← Home
                    </button>
                    <button type="button" className={styles.link} onClick={() => router.push("/admin/orders")}>
                        Admin: order queue →
                    </button>
                    <button
                        type="button"
                        className={styles.link}
                        onClick={() => {
                            void loadLog();
                            void loadSubmittedOrders();
                        }}
                        disabled={logLoading || submittedLoading}
                    >
                        {logLoading || submittedLoading ? "Refreshing…" : "Refresh log & queue"}
                    </button>
                </div>

                <Headline size={2}>Admin: deposit reconciliation</Headline>
                <p className={styles.lead}>
                    Match incoming fiat to <strong>submitted</strong> orders, verify <strong>amount and currency</strong>{" "}
                    before the order can be funded, and store <strong>timestamped</strong> reconciliation events
                    (FCX-41). The engine (FCX-23) records every outcome; only <strong>matched</strong> moves the order
                    to <strong>paid</strong> when the payment is within tolerance.
                </p>

                <section className={styles.workflow} aria-labelledby="workflow-heading">
                    <h2 id="workflow-heading" className={styles.sectionTitle}>
                        Under / over / mismatch workflow
                    </h2>
                    <ul className={styles.workflowList}>
                        <li>
                            <strong>Matched</strong> — amount and currency line up (within bps tolerance). Order
                            becomes <code className={styles.code}>paid</code>; AML/sanctions at funding are stored for
                            later approval to purchase.
                        </li>
                        <li>
                            <strong>Amount under / over</strong> — order stays <code className={styles.code}>submitted</code>{" "}
                            with the deposit on record. Ops: top-up, partial refund, adjust in policy, or fail the
                            order after review.
                        </li>
                        <li>
                            <strong>Currency mismatch</strong> — never auto-matches. Hold, contact customer, return or
                            re-book per procedure.
                        </li>
                    </ul>
                </section>

                {!isAuthenticated && (
                    <p className={styles.warn} role="status">
                        Log in to act as an admin user (your Firebase UID is the `adminUserId` sent with every call).
                    </p>
                )}

                <section className={styles.section} aria-labelledby="roles-heading">
                    <h2 id="roles-heading" className={styles.sectionTitle}>
                        Demo roles
                    </h2>
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
                        View log: <strong>{canView ? "yes" : "no"}</strong> · Reconcile deposit:{" "}
                        <strong>{canReconcile ? "yes" : "no"}</strong>
                    </p>
                </section>

                <section className={styles.section} aria-labelledby="pending-heading">
                    <h2 id="pending-heading" className={styles.sectionTitle}>
                        Submitted orders (awaiting funding)
                    </h2>
                    <p className={styles.hint}>
                        Use the order <strong>id</strong> as the bank <strong>reference</strong> when the wire memo
                        allows, or set &quot;override order id&quot; below. Amount/currency on the order must match the
                        deposit after tolerance for a <code className={styles.code}>matched</code> result.
                    </p>
                    {submittedError && (
                        <p className={styles.error} role="alert">
                            {submittedError}
                        </p>
                    )}
                    {!canView ? (
                        <p className={styles.hint}>Select a role with view access to list pending orders.</p>
                    ) : submittedLoading ? (
                        <p className={styles.hint}>Loading…</p>
                    ) : submittedOrders.length === 0 ? (
                        <p className={styles.hint}>No submitted orders in the queue.</p>
                    ) : (
                        <ul className={styles.pendingList}>
                            {submittedOrders.map((o) => (
                                <li key={o.id} className={styles.pendingRow}>
                                    <div>
                                        <code className={styles.code}>{o.id}</code>
                                        <span className={styles.pendingAmt}>
                                            {o.fiatAmount} {o.fiatCurrency}
                                        </span>
                                    </div>
                                    <div className={styles.pendingActions}>
                                        <button
                                            type="button"
                                            className={styles.copyMini}
                                            onClick={async () => {
                                                try {
                                                    await navigator.clipboard?.writeText(o.id);
                                                } catch {
                                                    /* ignore */
                                                }
                                            }}
                                        >
                                            Copy id
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className={styles.section} aria-labelledby="form-heading">
                    <h2 id="form-heading" className={styles.sectionTitle}>
                        Record a deposit
                    </h2>
                    <p className={styles.hint}>
                        Reference should match the order id (or the order’s idempotency key / explicit deposit
                        reference). Leave &quot;override&quot; blank to auto-resolve from the reference.
                    </p>
                    <div className={styles.formGrid}>
                        <label className={styles.field}>
                            <span>Deposit id</span>
                            <input
                                className={styles.input}
                                value={deposit.id}
                                onChange={setDepositField("id")}
                                placeholder="dep_abc123"
                            />
                        </label>
                        <label className={styles.field}>
                            <span>Amount</span>
                            <input
                                className={styles.input}
                                value={deposit.amount}
                                onChange={setDepositField("amount")}
                                inputMode="decimal"
                                placeholder="100.00"
                            />
                        </label>
                        <label className={styles.field}>
                            <span>Currency</span>
                            <input
                                className={styles.input}
                                value={deposit.currency}
                                onChange={setDepositField("currency")}
                                placeholder="USD"
                            />
                        </label>
                        <label className={styles.field}>
                            <span>Reference (order id / idempotency key)</span>
                            <input
                                className={styles.input}
                                value={deposit.reference}
                                onChange={setDepositField("reference")}
                                placeholder="ord_..."
                            />
                        </label>
                        <label className={styles.field}>
                            <span>Received at (ISO)</span>
                            <input
                                className={styles.input}
                                value={deposit.receivedAt}
                                onChange={setDepositField("receivedAt")}
                                placeholder="2026-04-23T10:30:00.000Z"
                            />
                        </label>
                        <label className={styles.field}>
                            <span>Processor</span>
                            <input
                                className={styles.input}
                                value={deposit.processor}
                                onChange={setDepositField("processor")}
                                placeholder="ACME_BANK"
                            />
                        </label>
                        <label className={styles.field}>
                            <span>Override order id (optional)</span>
                            <input
                                className={styles.input}
                                value={orderIdOverride}
                                onChange={(e) => setOrderIdOverride(e.target.value)}
                                placeholder="ord_..."
                            />
                        </label>
                        <label className={styles.field}>
                            <span>Tolerance (bps)</span>
                            <input
                                className={styles.input}
                                value={toleranceBps}
                                onChange={(e) => setToleranceBps(e.target.value)}
                                inputMode="numeric"
                                placeholder="0"
                            />
                        </label>
                    </div>
                    <label className={styles.field}>
                        <span>Notes</span>
                        <textarea
                            className={styles.textarea}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            placeholder="Optional — e.g. matched against bank slip #12345"
                        />
                    </label>
                    <div className={styles.formGrid}>
                        <label className={styles.field}>
                            <span>AML result (stored on match → paid)</span>
                            <select
                                className={styles.input}
                                value={amlCheckStatus}
                                onChange={(e) => setAmlCheckStatus(e.target.value)}
                                aria-label="AML screening result at funding"
                            >
                                {Object.values(COMPLIANCE_CHECK_STATUS).map((v) => (
                                    <option key={v} value={v}>
                                        {v}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className={styles.field}>
                            <span>Sanctions result (stored on match → paid)</span>
                            <select
                                className={styles.input}
                                value={sanctionsCheckStatus}
                                onChange={(e) => setSanctionsCheckStatus(e.target.value)}
                                aria-label="Sanctions screening result at funding"
                            >
                                {Object.values(COMPLIANCE_CHECK_STATUS).map((v) => (
                                    <option key={v} value={v}>
                                        {v}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                    {submitError && (
                        <p className={styles.error} role="alert">
                            {submitError}
                        </p>
                    )}
                    <div className={styles.buttons}>
                        <button type="button" className={styles.secondary} onClick={fillDemoValues}>
                            Fill demo deposit
                        </button>
                        <button
                            type="button"
                            className={styles.primary}
                            onClick={submit}
                            disabled={submitting || !canReconcile}
                        >
                            {submitting ? "Reconciling…" : "Reconcile deposit"}
                        </button>
                    </div>
                </section>

                {lastResult && (
                    <div
                        className={
                            lastResult.ok ? styles.banner : styles.errorBanner
                        }
                        role="status"
                    >
                        <strong>{outcomeLabel(lastResult.outcome)}</strong>
                        {lastResult.event?.reconciledAt ? (
                            <> · recorded at {lastResult.event.reconciledAt}</>
                        ) : null}
                        {lastResult.event?.varianceMinor ? (
                            <> · variance {lastResult.event.varianceMinor} {lastResult.event.depositCurrency}</>
                        ) : null}
                        {lastResult.order?.id ? (
                            <>
                                {" "}· order{" "}
                                <code className={styles.code}>{lastResult.order.id}</code> now{" "}
                                <strong>{lastResult.order.status}</strong>
                            </>
                        ) : null}
                    </div>
                )}

                <section className={styles.section} aria-labelledby="log-heading">
                    <h2 id="log-heading" className={styles.sectionTitle}>
                        Reconciliation log (most recent first)
                    </h2>
                    {logError && (
                        <p className={styles.error} role="alert">
                            {logError}
                        </p>
                    )}
                    {!canView ? (
                        <p className={styles.hint}>Your selected roles don’t allow viewing the audit log.</p>
                    ) : events.length === 0 ? (
                        <p className={styles.hint}>No reconciliation events yet.</p>
                    ) : (
                        <ul className={styles.list}>
                            {events.map((e) => (
                                <li key={e.eventId} className={styles.eventCard}>
                                    <div className={styles.eventHead}>
                                        <span className={styles.outcome}>{outcomeLabel(e.outcome)}</span>
                                        <code className={styles.code}>{e.depositId}</code>
                                    </div>
                                    <div className={styles.eventMeta}>
                                        <span>At: {e.reconciledAt}</span>
                                        <span>
                                            Amount: {e.depositAmount} {e.depositCurrency}
                                        </span>
                                        {e.expectedAmount && (
                                            <span>
                                                Expected: {e.expectedAmount} {e.expectedCurrency}
                                            </span>
                                        )}
                                        {e.varianceMinor && <span>Variance: {e.varianceMinor}</span>}
                                        {e.orderId && (
                                            <span>
                                                Order: <code className={styles.code}>{e.orderId}</code>
                                            </span>
                                        )}
                                        {e.actor && <span>By: {e.actor}</span>}
                                    </div>
                                    {e.notes && <p className={styles.note}>{e.notes}</p>}
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </Container>
    );
};

export default AdminDepositReconciliationScreen;
