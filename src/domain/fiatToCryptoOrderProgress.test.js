import { COMPLIANCE_BLOCK_REASON_CODES } from "./fiatToCryptoCompliance";
import { FIAT_TO_CRYPTO_ORDER_STATUS } from "./fiatToCryptoOrder";
import {
    appendOrderProgressNotificationEvents,
    buildCompletedOrderDeliverySummary,
    buildUserOrderStatusTimeline,
    getOrderProgressNotificationEventsForOrder,
    getOrderProgressNotificationTriggers,
    getUserFacingFailureGuidance,
    ORDER_PROGRESS_NOTIFICATION_TRIGGER,
    resetOrderProgressNotificationLogForTests,
    USER_ORDER_TIMELINE_STATUS_ORDER,
} from "./fiatToCryptoOrderProgress";

describe("fiatToCryptoOrderProgress (FCX-20)", () => {
    describe("buildUserOrderStatusTimeline", () => {
        it("marks earlier steps done and current active on happy path", () => {
            const steps = buildUserOrderStatusTimeline(FIAT_TO_CRYPTO_ORDER_STATUS.PURCHASING);
            expect(steps).toHaveLength(USER_ORDER_TIMELINE_STATUS_ORDER.length);
            expect(steps[0].variant).toBe("done");
            expect(steps[1].variant).toBe("done");
            expect(steps[2].variant).toBe("active");
            expect(steps[3].variant).toBe("pending");
        });

        it("marks all done when completed", () => {
            const steps = buildUserOrderStatusTimeline(FIAT_TO_CRYPTO_ORDER_STATUS.COMPLETED);
            expect(steps.every((s) => s.variant === "done")).toBe(true);
        });

        it("marks failure step as error when failed", () => {
            const steps = buildUserOrderStatusTimeline(FIAT_TO_CRYPTO_ORDER_STATUS.FAILED, {
                failureTimelineIndex: 3,
            });
            expect(steps[2].variant).toBe("done");
            expect(steps[3].variant).toBe("error");
            expect(steps[4].variant).toBe("pending");
        });
    });

    describe("getOrderProgressNotificationTriggers", () => {
        it("returns triggers for major lifecycle entries", () => {
            expect(getOrderProgressNotificationTriggers(null, FIAT_TO_CRYPTO_ORDER_STATUS.SUBMITTED)).toContain(
                ORDER_PROGRESS_NOTIFICATION_TRIGGER.ORDER_SUBMITTED,
            );
            expect(getOrderProgressNotificationTriggers("submitted", FIAT_TO_CRYPTO_ORDER_STATUS.PAID)).toContain(
                ORDER_PROGRESS_NOTIFICATION_TRIGGER.PAYMENT_CONFIRMED,
            );
            expect(getOrderProgressNotificationTriggers("transferring", FIAT_TO_CRYPTO_ORDER_STATUS.COMPLETED)).toContain(
                ORDER_PROGRESS_NOTIFICATION_TRIGGER.DELIVERY_COMPLETED,
            );
            expect(getOrderProgressNotificationTriggers("paid", FIAT_TO_CRYPTO_ORDER_STATUS.FAILED)).toContain(
                ORDER_PROGRESS_NOTIFICATION_TRIGGER.ORDER_FAILED,
            );
        });
    });

    describe("getUserFacingFailureGuidance", () => {
        it("returns null when not failed", () => {
            expect(getUserFacingFailureGuidance({ status: FIAT_TO_CRYPTO_ORDER_STATUS.PAID })).toBeNull();
        });

        it("maps KYC compliance codes to next steps", () => {
            const g = getUserFacingFailureGuidance({
                status: FIAT_TO_CRYPTO_ORDER_STATUS.FAILED,
                failureCode: COMPLIANCE_BLOCK_REASON_CODES.KYC_REJECTED,
                id: "ord-1",
            });
            expect(g?.title).toMatch(/identity/i);
            expect(g?.nextSteps.join(" ")).toMatch(/ord-1|support/i);
        });
    });

    describe("buildCompletedOrderDeliverySummary", () => {
        it("returns null unless completed", () => {
            expect(buildCompletedOrderDeliverySummary({ status: FIAT_TO_CRYPTO_ORDER_STATUS.PAID })).toBeNull();
        });

        it("includes delivered amount and transaction reference", () => {
            const s = buildCompletedOrderDeliverySummary({
                status: FIAT_TO_CRYPTO_ORDER_STATUS.COMPLETED,
                targetAssetCode: "btc",
                deliveredAssetAmount: "0.01543210",
                deliveredAssetCode: "BTC",
                transferTxHash: "0xabc123",
            });
            expect(s?.deliveredLine).toMatch(/0\.01543210/);
            expect(s?.deliveredLine).toMatch(/BTC/);
            expect(s?.transactionReference).toBe("0xabc123");
        });
    });

    describe("FCX-46 notification log", () => {
        beforeEach(() => {
            resetOrderProgressNotificationLogForTests();
        });

        it("appendOrderProgressNotificationEvents records rows per transition", () => {
            appendOrderProgressNotificationEvents({
                orderId: "o1",
                userId: "u1",
                fromStatus: null,
                toStatus: FIAT_TO_CRYPTO_ORDER_STATUS.SUBMITTED,
            });
            expect(getOrderProgressNotificationEventsForOrder("o1")).toHaveLength(1);
            appendOrderProgressNotificationEvents({
                orderId: "o1",
                userId: "u1",
                fromStatus: FIAT_TO_CRYPTO_ORDER_STATUS.SUBMITTED,
                toStatus: FIAT_TO_CRYPTO_ORDER_STATUS.PAID,
            });
            expect(getOrderProgressNotificationEventsForOrder("o1").length).toBe(2);
        });
    });
});
