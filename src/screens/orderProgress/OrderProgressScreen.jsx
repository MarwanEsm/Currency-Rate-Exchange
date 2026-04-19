import React, { useMemo, useState } from "react";
import { useRouter } from "next/router";
import Container from "@/components/layout/container/Container";
import Headline from "@/components/elements/headline/Headline";
import OrderProgressTimeline from "@/components/fiatToCrypto/OrderProgressTimeline";
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
    const [status, setStatus] = useState(FIAT_TO_CRYPTO_ORDER_STATUS.PURCHASING);
    const [failureTimelineIndex, setFailureTimelineIndex] = useState(3);
    const [failureCode, setFailureCode] = useState("");

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

    const timeline = useMemo(
        () =>
            buildUserOrderStatusTimeline(status, {
                failureTimelineIndex:
                    status === FIAT_TO_CRYPTO_ORDER_STATUS.FAILED ? failureTimelineIndex : undefined,
            }),
        [status, failureTimelineIndex],
    );

    const failureGuidance = useMemo(() => getUserFacingFailureGuidance(demoOrder), [demoOrder]);
    const completedSummary = useMemo(() => buildCompletedOrderDeliverySummary(demoOrder), [demoOrder]);

    const prev = getDemoPreviousStatus(status, failureTimelineIndex);
    const notificationTriggers = getOrderProgressNotificationTriggers(prev, status);

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
                </div>
                <Headline size={2}>Purchase status</Headline>
                <p className={styles.lead}>
                    Demo view for FCX-20: timeline, notification hooks, failure guidance, and delivery summary.
                </p>

                <div className={styles.controls}>
                    <label className={styles.field}>
                        <span>Order status</span>
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

                <section className={styles.section} aria-labelledby="timeline-heading">
                    <h2 id="timeline-heading" className={styles.sectionTitle}>
                        Status timeline
                    </h2>
                    <OrderProgressTimeline steps={timeline} />
                </section>

                <section className={styles.section} aria-labelledby="notify-heading">
                    <h2 id="notify-heading" className={styles.sectionTitle}>
                        Notification triggers (on reaching this status)
                    </h2>
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
                </section>

                {status === FIAT_TO_CRYPTO_ORDER_STATUS.FAILED && failureGuidance && (
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

                {status === FIAT_TO_CRYPTO_ORDER_STATUS.COMPLETED && completedSummary && (
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
