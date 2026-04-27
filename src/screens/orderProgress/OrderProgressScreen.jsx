/**
 * User-facing purchase status: live tracking (FCX-46) or interactive demo (FCX-20).
 */
import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Container from "@/components/layout/container/Container";
import Headline from "@/components/elements/headline/Headline";
import OrderProgressTimeline from "@/components/fiatToCrypto/OrderProgressTimeline";
import { AuthContext } from "@/firebase/authContext";
import { FIAT_TO_CRYPTO_ORDER_STATUS } from "@/domain/fiatToCryptoOrder";
import {
    buildCompletedOrderDeliverySummary,
    buildUserOrderStatusTimeline,
    getOrderProgressNotificationTriggers,
    getUserFacingFailureGuidance,
    ORDER_PROGRESS_NOTIFICATION_DEFINITIONS,
    USER_ORDER_TIMELINE_STATUS_ORDER,
} from "@/domain/fiatToCryptoOrderProgress";
import styles from "./OrderProgressScreen.module.scss";

const STATUS_OPTIONS = Object.values(FIAT_TO_CRYPTO_ORDER_STATUS);

const getDemoPreviousStatus = (status, failureTimelineIndex) => {
    if (status === FIAT_TO_CRYPTO_ORDER_STATUS.FAILED) {
        const fi =
            typeof failureTimelineIndex === "number" && failureTimelineIndex > 0
                ? failureTimelineIndex
                : 2;
        return USER_ORDER_TIMELINE_STATUS_ORDER[fi - 1] ?? null;
    }
    const idx = USER_ORDER_TIMELINE_STATUS_ORDER.indexOf(status);
    if (idx <= 0) return null;
    return USER_ORDER_TIMELINE_STATUS_ORDER[idx - 1];
};

const OrderProgressScreen = () => {
    const router = useRouter();
    const { user, isAuthenticated } = useContext(AuthContext);

    const orderIdFromQuery = useMemo(() => {
        const q = router.query?.id;
        if (typeof q === "string") return q.trim();
        if (Array.isArray(q) && typeof q[0] === "string") return q[0].trim();
        return "";
    }, [router.query?.id]);

    const isLive = Boolean(orderIdFromQuery);

    const [status, setStatus] = useState(FIAT_TO_CRYPTO_ORDER_STATUS.PURCHASING);
    const [failureTimelineIndex, setFailureTimelineIndex] = useState(3);
    const [failureCode, setFailureCode] = useState("");

    const [liveOrder, setLiveOrder] = useState(null);
    const [liveNotifications, setLiveNotifications] = useState([]);
    const [liveLoading, setLiveLoading] = useState(false);
    const [liveError, setLiveError] = useState(null);

    const loadLiveOrder = useCallback(async () => {
        if (!orderIdFromQuery || !user?.uid) {
            setLiveOrder(null);
            setLiveNotifications([]);
            return;
        }
        setLiveLoading(true);
        setLiveError(null);
        try {
            const res = await fetch(`/api/fiat-to-crypto/orders/${encodeURIComponent(orderIdFromQuery)}`, {
                method: "GET",
                headers: { "x-user-id": user.uid },
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setLiveError(data.error || "Could not load order.");
                setLiveOrder(null);
                setLiveNotifications([]);
                return;
            }
            setLiveOrder(data.order ?? null);
            setLiveNotifications(Array.isArray(data.notifications) ? data.notifications : []);
        } catch {
            setLiveError("Network error. Please retry.");
            setLiveOrder(null);
            setLiveNotifications([]);
        } finally {
            setLiveLoading(false);
        }
    }, [orderIdFromQuery, user?.uid]);

    useEffect(() => {
        if (!router.isReady) return;
        if (isLive && user?.uid) {
            loadLiveOrder();
        }
    }, [router.isReady, isLive, user?.uid, loadLiveOrder]);

    const demoOrder = useMemo(
        () => ({
            id: "demo-ord-FCX20",
            status,
            failureCode: status === FIAT_TO_CRYPTO_ORDER_STATUS.FAILED ? failureCode || undefined : undefined,
            failureMessage: status === FIAT_TO_CRYPTO_ORDER_STATUS.FAILED ? undefined : undefined,
            targetAssetCode: "BTC",
            deliveredAssetAmount: "0.0125",
            deliveredAssetCode: "BTC",
            transferTxHash: "0x9f2a7b1c4e8d3a6f5c2b9e1d4a7f0c3b6e9d2a5f8c1b4e7d0a3f6c9b2e5d8a1f4",
        }),
        [status, failureCode],
    );

    const effectiveOrder = isLive && liveOrder ? liveOrder : demoOrder;
    const effectiveStatus = effectiveOrder?.status ?? FIAT_TO_CRYPTO_ORDER_STATUS.SUBMITTED;

    const timeline = useMemo(
        () =>
            buildUserOrderStatusTimeline(effectiveStatus, {
                failureTimelineIndex:
                    effectiveStatus === FIAT_TO_CRYPTO_ORDER_STATUS.FAILED && !isLive
                        ? failureTimelineIndex
                        : undefined,
            }),
        [effectiveStatus, failureTimelineIndex, isLive],
    );

    const failureGuidance = useMemo(() => getUserFacingFailureGuidance(effectiveOrder), [effectiveOrder]);
    const completedSummary = useMemo(() => buildCompletedOrderDeliverySummary(effectiveOrder), [effectiveOrder]);

    const prev = isLive
        ? null
        : getDemoPreviousStatus(status, failureTimelineIndex);
    const notificationTriggers = isLive
        ? []
        : getOrderProgressNotificationTriggers(prev, status);

    const sortedLiveNotifications = useMemo(
        () => [...liveNotifications].sort((a, b) => String(b.occurredAt).localeCompare(String(a.occurredAt))),
        [liveNotifications],
    );

    return (
        <Container>
            <div className={styles.wrap}>
                <div className={styles.topNav}>
                    <button type="button" className={styles.back} onClick={() => router.push("/")}>
                        ← Home
                    </button>
                    <button type="button" className={styles.back} onClick={() => router.push("/orders/new")}>
                        New request
                    </button>
                    {isLive && (
                        <button
                            type="button"
                            className={styles.back}
                            onClick={() => loadLiveOrder()}
                            disabled={liveLoading || !user?.uid}
                        >
                            {liveLoading ? "Refreshing…" : "Refresh status"}
                        </button>
                    )}
                </div>
                <Headline size={2}>Purchase status</Headline>
                <p className={styles.lead}>
                    {isLive ? (
                        <>
                            Live tracking for order <code className={styles.code}>{orderIdFromQuery}</code> (FCX-46).
                            Notification events are recorded when your order moves between statuses.
                        </>
                    ) : (
                        <>
                            Interactive demo (FCX-20): choose a status to preview the timeline and triggers. Open{" "}
                            <strong>View status</strong> from a submitted request to see your real order here.
                        </>
                    )}
                </p>

                {isLive && !isAuthenticated && (
                    <p className={styles.warn} role="status">
                        Log in as the same account that created the request to load this order.
                    </p>
                )}

                {isLive && liveError && (
                    <p className={styles.error} role="alert">
                        {liveError}
                    </p>
                )}

                {!isLive && (
                    <div className={styles.controls}>
                        <label className={styles.field}>
                            <span>Order status (demo)</span>
                            <select
                                className={styles.select}
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                aria-label="Simulate order status"
                            >
                                {STATUS_OPTIONS.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </select>
                        </label>

                        {status === FIAT_TO_CRYPTO_ORDER_STATUS.FAILED && (
                            <>
                                <label className={styles.field}>
                                    <span>Failure stage index (0–4)</span>
                                    <input
                                        className={styles.input}
                                        type="number"
                                        min={0}
                                        max={4}
                                        value={failureTimelineIndex}
                                        onChange={(e) => setFailureTimelineIndex(Number(e.target.value))}
                                        aria-label="Failure timeline index"
                                    />
                                </label>
                                <label className={styles.field}>
                                    <span>Failure code (optional)</span>
                                    <input
                                        className={styles.input}
                                        type="text"
                                        value={failureCode}
                                        onChange={(e) => setFailureCode(e.target.value)}
                                        placeholder="e.g. kyc_rejected"
                                        aria-label="Failure code"
                                    />
                                </label>
                            </>
                        )}
                    </div>
                )}

                <section className={styles.section} aria-labelledby="timeline-heading">
                    <h2 id="timeline-heading" className={styles.sectionTitle}>
                        Status timeline
                    </h2>
                    {isLive && liveLoading && !liveOrder ? (
                        <p className={styles.hint}>Loading…</p>
                    ) : (
                        <OrderProgressTimeline steps={timeline} />
                    )}
                </section>

                <section className={styles.section} aria-labelledby="notify-heading">
                    <h2 id="notify-heading" className={styles.sectionTitle}>
                        Notifications
                    </h2>
                    {isLive ? (
                        sortedLiveNotifications.length === 0 ? (
                            <p className={styles.hint}>No notification events recorded yet for this order.</p>
                        ) : (
                            <ul className={styles.list}>
                                {sortedLiveNotifications.map((n, idx) => (
                                    <li key={`${n.occurredAt}-${n.trigger}-${n.toStatus}-${idx}`}>
                                        <span className={styles.notifyTime}>{n.occurredAt}</span>
                                        {" · "}
                                        <code className={styles.code}>{n.trigger}</code>
                                        {" — "}
                                        {ORDER_PROGRESS_NOTIFICATION_DEFINITIONS[n.trigger]?.summary ?? "—"}
                                        {n.fromStatus != null ? (
                                            <>
                                                {" "}
                                                <span className={styles.hintInline}>
                                                    ({n.fromStatus} → {n.toStatus})
                                                </span>
                                            </>
                                        ) : null}
                                    </li>
                                ))}
                            </ul>
                        )
                    ) : (
                        <ul className={styles.list}>
                            {notificationTriggers.length === 0 ? (
                                <li>No automated triggers mapped for this transition in the demo.</li>
                            ) : (
                                notificationTriggers.map((key) => (
                                    <li key={key}>
                                        <code className={styles.code}>{key}</code>
                                        {" — "}
                                        {ORDER_PROGRESS_NOTIFICATION_DEFINITIONS[key]?.summary ?? "—"}
                                    </li>
                                ))
                            )}
                        </ul>
                    )}
                </section>

                {effectiveStatus === FIAT_TO_CRYPTO_ORDER_STATUS.FAILED && failureGuidance && (
                    <section className={styles.alert} role="alert" aria-labelledby="fail-heading">
                        <h2 id="fail-heading" className={styles.sectionTitle}>
                            {failureGuidance.title}
                        </h2>
                        <p className={styles.lead}>{failureGuidance.body}</p>
                        <p className={styles.nextLabel}>What you can do next</p>
                        <ol className={styles.numbered}>
                            {failureGuidance.nextSteps.map((line, i) => (
                                <li key={i}>{line}</li>
                            ))}
                        </ol>
                    </section>
                )}

                {effectiveStatus === FIAT_TO_CRYPTO_ORDER_STATUS.COMPLETED && completedSummary && (
                    <section className={styles.success} aria-labelledby="done-heading">
                        <h2 id="done-heading" className={styles.sectionTitle}>
                            {completedSummary.headline}
                        </h2>
                        <p className={styles.delivered}>{completedSummary.deliveredLine}</p>
                        {completedSummary.transactionReference && (
                            <p className={styles.tx}>
                                <span className={styles.txLabel}>Transaction reference</span>
                                <code className={styles.code}>{completedSummary.transactionReference}</code>
                            </p>
                        )}
                        {completedSummary.footnote && (
                            <p className={styles.footnote}>{completedSummary.footnote}</p>
                        )}
                    </section>
                )}
            </div>
        </Container>
    );
};

export default OrderProgressScreen;
