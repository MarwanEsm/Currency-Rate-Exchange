import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Container from "@/components/layout/container/Container";
import Headline from "@/components/elements/headline/Headline";
import { AuthContext } from "@/firebase/authContext";
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

    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [lastResult, setLastResult] = useState(null);

    const [events, setEvents] = useState([]);
    const [logError, setLogError] = useState(null);
    const [logLoading, setLogLoading] = useState(false);

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

    useEffect(() => {
        loadLog();
    }, [loadLog]);

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
                    <button type="button" className={styles.link} onClick={loadLog} disabled={logLoading}>
                        {logLoading ? "Refreshing log…" : "Refresh log"}
                    </button>
                </div>

                <Headline size={2}>Admin: deposit reconciliation</Headline>
                <p className={styles.lead}>
                    Match incoming fiat deposits to <strong>submitted</strong> orders, verify amount and currency,
                    and record the reconciliation event (FCX-23). Only <strong>matched</strong> deposits auto-move
                    the order to <strong>paid</strong>; every other outcome is logged for manual workflow.
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
