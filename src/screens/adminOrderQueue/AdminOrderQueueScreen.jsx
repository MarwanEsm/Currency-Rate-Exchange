import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Container from "@/components/layout/container/Container";
import Headline from "@/components/elements/headline/Headline";
import { AuthContext } from "@/firebase/authContext";
import { ADMIN_ROLE, ADMIN_PERMISSION, hasAdminPermission } from "@/domain/adminPermissions";
import { ADMIN_DECISION } from "@/domain/fiatToCryptoAdminQueue";
import styles from "./AdminOrderQueueScreen.module.scss";

const ROLE_OPTIONS = Object.values(ADMIN_ROLE);

const buildAdminHeaders = (adminUserId, roles) => ({
    "Content-Type": "application/json",
    "x-admin-user-id": adminUserId,
    "x-admin-roles": roles.join(","),
});

const AdminOrderQueueScreen = () => {
    const router = useRouter();
    const { user, isAuthenticated } = useContext(AuthContext);

    const [roles, setRoles] = useState([ADMIN_ROLE.ORDER_REVIEWER]);
    const [orders, setOrders] = useState([]);
    const [listError, setListError] = useState(null);
    const [loading, setLoading] = useState(false);

    const [activeOrderId, setActiveOrderId] = useState(null);
    const [reason, setReason] = useState("");
    const [decisionBusy, setDecisionBusy] = useState(false);
    const [decisionError, setDecisionError] = useState(null);
    const [decisionBanner, setDecisionBanner] = useState(null);

    const canView = useMemo(() => hasAdminPermission(roles, ADMIN_PERMISSION.VIEW_ORDER_QUEUE), [roles]);
    const canDecide = useMemo(() => hasAdminPermission(roles, ADMIN_PERMISSION.DECIDE_ORDER_APPROVAL), [roles]);

    const adminUserId = user?.uid ?? "";

    const toggleRole = (role) => {
        setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
    };

    const loadQueue = useCallback(async () => {
        if (!adminUserId || !canView) {
            setOrders([]);
            return;
        }
        setLoading(true);
        setListError(null);
        try {
            const res = await fetch("/api/fiat-to-crypto/admin/queue", {
                method: "GET",
                headers: buildAdminHeaders(adminUserId, roles),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setListError(data.error || "Failed to load queue.");
                return;
            }
            setOrders(Array.isArray(data.orders) ? data.orders : []);
        } catch {
            setListError("Network error. Please retry.");
        } finally {
            setLoading(false);
        }
    }, [adminUserId, canView, roles]);

    useEffect(() => {
        loadQueue();
    }, [loadQueue]);

    const submitDecision = async (decision) => {
        if (!activeOrderId || !canDecide || reason.trim().length < 3) {
            setDecisionError("A reason of at least 3 characters is required.");
            return;
        }
        setDecisionBusy(true);
        setDecisionError(null);
        try {
            const res = await fetch(`/api/fiat-to-crypto/admin/orders/${encodeURIComponent(activeOrderId)}/decision`, {
                method: "POST",
                headers: buildAdminHeaders(adminUserId, roles),
                body: JSON.stringify({ decision, reason }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                const compliance = Array.isArray(data.complianceReasonCodes) ? ` (${data.complianceReasonCodes.join(", ")})` : "";
                setDecisionError((data.message || data.error || "Decision failed.") + compliance);
                return;
            }
            setDecisionBanner({
                decision: data.decision,
                orderId: data.order?.id,
                newStatus: data.order?.status,
            });
            setReason("");
            setActiveOrderId(null);
            await loadQueue();
        } catch {
            setDecisionError("Network error. Please retry.");
        } finally {
            setDecisionBusy(false);
        }
    };

    return (
        <Container>
            <div className={styles.wrap}>
                <div className={styles.topNav}>
                    <button type="button" className={styles.link} onClick={() => router.push("/")}>
                        ← Home
                    </button>
                    <button type="button" className={styles.link} onClick={loadQueue} disabled={loading}>
                        {loading ? "Refreshing…" : "Refresh"}
                    </button>
                </div>

                <Headline size={2}>Admin: pending approvals</Headline>
                <p className={styles.lead}>
                    Lists fiat-to-crypto orders in <strong>paid</strong> awaiting review (FCX-26). Approve to move
                    toward <strong>purchasing</strong>, or reject with a reason to mark <strong>failed</strong>.
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
                        <strong>{canDecide ? "yes" : "no"}</strong>
                    </p>
                </section>

                {decisionBanner && (
                    <div className={styles.banner} role="status">
                        Decision <strong>{decisionBanner.decision}</strong> applied to order{" "}
                        <code className={styles.code}>{decisionBanner.orderId}</code> — now{" "}
                        <strong>{decisionBanner.newStatus}</strong>.
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
                                        <div className={styles.orderActions}>
                                            <button
                                                type="button"
                                                className={styles.secondary}
                                                disabled={!canDecide}
                                                onClick={() => {
                                                    setActiveOrderId(isActive ? null : order.id);
                                                    setDecisionError(null);
                                                }}
                                            >
                                                {isActive ? "Cancel" : "Decide…"}
                                            </button>
                                        </div>
                                        {isActive && (
                                            <div className={styles.decisionPane}>
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
            </div>
        </Container>
    );
};

export default AdminOrderQueueScreen;
