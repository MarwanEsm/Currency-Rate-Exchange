/**
 * Minimal admin inbox: new customer requests in `submitted` only.
 * Fulfillment continues outside the app; this view is for visibility and copy/paste of details.
 */
import React, { useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Container from "@/components/layout/container/Container";
import Headline from "@/components/elements/headline/Headline";
import { AuthContext } from "@/firebase/authContext";
import { ADMIN_ROLE } from "@/domain/adminPermissions";
import styles from "./AdminSubmittedOrdersScreen.module.scss";

const buildAdminHeaders = (adminUserId) => ({
    "Content-Type": "application/json",
    "x-admin-user-id": adminUserId,
    "x-admin-roles": ADMIN_ROLE.ORDER_REVIEWER,
});

const AdminSubmittedOrdersScreen = () => {
    const router = useRouter();
    const { user, isAuthenticated } = useContext(AuthContext);

    const [orders, setOrders] = useState([]);
    const [listError, setListError] = useState(null);
    const [loading, setLoading] = useState(false);

    const adminUserId = user?.uid ?? "";

    const loadQueue = useCallback(async () => {
        if (!adminUserId) {
            setOrders([]);
            return;
        }
        setLoading(true);
        setListError(null);
        try {
            const res = await fetch("/api/fiat-to-crypto/admin/queue?status=submitted", {
                method: "GET",
                headers: buildAdminHeaders(adminUserId),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setListError(data.error || "Failed to load requests.");
                return;
            }
            setOrders(Array.isArray(data.orders) ? data.orders : []);
        } catch {
            setListError("Network error. Please retry.");
        } finally {
            setLoading(false);
        }
    }, [adminUserId]);

    useEffect(() => {
        loadQueue();
    }, [loadQueue]);

    return (
        <Container>
            <div className={styles.wrap}>
                <button type="button" className={styles.back} onClick={() => router.push("/")}>
                    ← Home
                </button>
                <Headline size={2}>New buy requests</Headline>
                <p className={styles.lead}>
                    Submitted customer requests appear here. Process deposits, pricing, and delivery in your operations
                    tools — this screen is only an inbox.
                </p>

                {!isAuthenticated && (
                    <p className={styles.note} role="status">
                        Sign in with an admin-allowed account to load the queue.
                    </p>
                )}

                <div className={styles.toolbar}>
                    <button type="button" className={styles.refresh} onClick={loadQueue} disabled={loading || !adminUserId}>
                        {loading ? "Refreshing…" : "Refresh"}
                    </button>
                </div>

                {listError && (
                    <p className={styles.error} role="alert">
                        {listError}
                    </p>
                )}

                {!listError && !loading && orders.length === 0 && adminUserId ? (
                    <p className={styles.empty}>No submitted requests right now.</p>
                ) : null}

                <ul className={styles.list}>
                    {orders.map((o) => (
                        <li key={o.id} className={styles.card}>
                            <div className={styles.cardHead}>
                                <code className={styles.id}>{o.id}</code>
                                <span className={styles.badge}>{o.status}</span>
                            </div>
                            <dl className={styles.dl}>
                                <div>
                                    <dt>User</dt>
                                    <dd>{o.userId}</dd>
                                </div>
                                <div>
                                    <dt>Fiat</dt>
                                    <dd>
                                        {o.fiatAmount} {o.fiatCurrency}
                                    </dd>
                                </div>
                                <div>
                                    <dt>Asset</dt>
                                    <dd>{o.targetAssetCode}</dd>
                                </div>
                                <div>
                                    <dt>Network</dt>
                                    <dd>{o.network ?? "—"}</dd>
                                </div>
                                <div className={styles.fullRow}>
                                    <dt>Wallet</dt>
                                    <dd className={styles.mono}>{o.walletAddress}</dd>
                                </div>
                                <div>
                                    <dt>Submitted</dt>
                                    <dd>{o.submittedAt ?? o.createdAt ?? "—"}</dd>
                                </div>
                            </dl>
                        </li>
                    ))}
                </ul>
            </div>
        </Container>
    );
};

export default AdminSubmittedOrdersScreen;
