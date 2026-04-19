/**
 * User-visible order progress, notifications, and completion copy (FCX-20).
 *
 * Backend workers should call `getOrderProgressNotificationTriggers` when persisting transitions
 * to enqueue email/push/in-app events. UI uses `buildUserOrderStatusTimeline` and related helpers.
 */

import { COMPLIANCE_BLOCK_REASON_CODES } from "./fiatToCryptoCompliance";
import { FIAT_TO_CRYPTO_ORDER_STATUS } from "./fiatToCryptoOrder";

/** @typedef {import("./fiatToCryptoOrder.js").FiatToCryptoOrderStatus} FiatToCryptoOrderStatus */

/** Canonical timeline steps (happy path order). */
export const USER_ORDER_TIMELINE_STATUS_ORDER = Object.freeze([
    FIAT_TO_CRYPTO_ORDER_STATUS.SUBMITTED,
    FIAT_TO_CRYPTO_ORDER_STATUS.PAID,
    FIAT_TO_CRYPTO_ORDER_STATUS.PURCHASING,
    FIAT_TO_CRYPTO_ORDER_STATUS.TRANSFERRING,
    FIAT_TO_CRYPTO_ORDER_STATUS.COMPLETED,
]);

/**
 * @typedef {{
 *   statusKey: FiatToCryptoOrderStatus,
 *   title: string,
 *   description: string,
 *   variant: 'done' | 'active' | 'pending' | 'error',
 * }} UserOrderTimelineStep
 */

const TIMELINE_COPY = {
    [FIAT_TO_CRYPTO_ORDER_STATUS.SUBMITTED]: {
        title: "Request received",
        description: "We have your request and are waiting for payment confirmation.",
    },
    [FIAT_TO_CRYPTO_ORDER_STATUS.PAID]: {
        title: "Payment received",
        description: "Your fiat payment has been confirmed.",
    },
    [FIAT_TO_CRYPTO_ORDER_STATUS.PURCHASING]: {
        title: "Buying crypto",
        description: "We are acquiring your crypto at the agreed rate.",
    },
    [FIAT_TO_CRYPTO_ORDER_STATUS.TRANSFERRING]: {
        title: "Sending to your wallet",
        description: "Funds are being sent to the wallet address you provided.",
    },
    [FIAT_TO_CRYPTO_ORDER_STATUS.COMPLETED]: {
        title: "Delivered",
        description: "Crypto has been sent. Keep your transaction reference for your records.",
    },
};

/** Stable keys for notification / webhook subscribers. */
export const ORDER_PROGRESS_NOTIFICATION_TRIGGER = {
    ORDER_SUBMITTED: "order_submitted",
    PAYMENT_CONFIRMED: "order_payment_confirmed",
    PURCHASING_STARTED: "order_purchasing_started",
    TRANSFER_STARTED: "order_transfer_started",
    DELIVERY_COMPLETED: "order_delivery_completed",
    ORDER_FAILED: "order_failed",
};

/**
 * Human + channel hints for product/ops (not end-user strings).
 */
export const ORDER_PROGRESS_NOTIFICATION_DEFINITIONS = Object.freeze({
    [ORDER_PROGRESS_NOTIFICATION_TRIGGER.ORDER_SUBMITTED]: {
        channels: ["email", "in_app"],
        summary: "Acknowledge receipt of the request and how to pay / track.",
    },
    [ORDER_PROGRESS_NOTIFICATION_TRIGGER.PAYMENT_CONFIRMED]: {
        channels: ["email", "in_app"],
        summary: "Confirm good funds and set expectations for fulfillment time.",
    },
    [ORDER_PROGRESS_NOTIFICATION_TRIGGER.PURCHASING_STARTED]: {
        channels: ["in_app"],
        summary: "Optional: treasury started acquisition.",
    },
    [ORDER_PROGRESS_NOTIFICATION_TRIGGER.TRANSFER_STARTED]: {
        channels: ["email", "in_app"],
        summary: "Payout broadcast or custodial send has started; may include explorer link later.",
    },
    [ORDER_PROGRESS_NOTIFICATION_TRIGGER.DELIVERY_COMPLETED]: {
        channels: ["email", "in_app"],
        summary: "Delivered amount + transaction reference (FCX-21 fields).",
    },
    [ORDER_PROGRESS_NOTIFICATION_TRIGGER.ORDER_FAILED]: {
        channels: ["email", "in_app"],
        summary: "Failure summary + next-step guidance from `getUserFacingFailureGuidance`.",
    },
});

/**
 * @param {FiatToCryptoOrderStatus | null | undefined} fromStatus
 * @param {FiatToCryptoOrderStatus} toStatus
 * @returns {string[]}
 */
export const getOrderProgressNotificationTriggers = (fromStatus, toStatus) => {
    if (toStatus === FIAT_TO_CRYPTO_ORDER_STATUS.SUBMITTED) {
        return [ORDER_PROGRESS_NOTIFICATION_TRIGGER.ORDER_SUBMITTED];
    }
    if (toStatus === FIAT_TO_CRYPTO_ORDER_STATUS.PAID) {
        return [ORDER_PROGRESS_NOTIFICATION_TRIGGER.PAYMENT_CONFIRMED];
    }
    if (toStatus === FIAT_TO_CRYPTO_ORDER_STATUS.PURCHASING) {
        return [ORDER_PROGRESS_NOTIFICATION_TRIGGER.PURCHASING_STARTED];
    }
    if (toStatus === FIAT_TO_CRYPTO_ORDER_STATUS.TRANSFERRING) {
        return [ORDER_PROGRESS_NOTIFICATION_TRIGGER.TRANSFER_STARTED];
    }
    if (toStatus === FIAT_TO_CRYPTO_ORDER_STATUS.COMPLETED) {
        return [ORDER_PROGRESS_NOTIFICATION_TRIGGER.DELIVERY_COMPLETED];
    }
    if (toStatus === FIAT_TO_CRYPTO_ORDER_STATUS.FAILED) {
        return [ORDER_PROGRESS_NOTIFICATION_TRIGGER.ORDER_FAILED];
    }
    return [];
};

/**
 * @param {FiatToCryptoOrderStatus} currentStatus
 * @param {{ failureTimelineIndex?: number }} [options] When `currentStatus` is `failed`, index (0–4)
 *   into `USER_ORDER_TIMELINE_STATUS_ORDER` after which the failure occurred; defaults to `2` (post-payment).
 * @returns {UserOrderTimelineStep[]}
 */
export const buildUserOrderStatusTimeline = (currentStatus, options = {}) => {
    const steps = USER_ORDER_TIMELINE_STATUS_ORDER.map((statusKey) => {
        const copy = TIMELINE_COPY[statusKey];
        return {
            statusKey,
            title: copy.title,
            description: copy.description,
            variant: /** @type {'done' | 'active' | 'pending' | 'error'} */ ("pending"),
        };
    });

    if (currentStatus === FIAT_TO_CRYPTO_ORDER_STATUS.FAILED) {
        const failIdx =
            typeof options.failureTimelineIndex === "number" && options.failureTimelineIndex >= 0
                ? Math.min(options.failureTimelineIndex, steps.length - 1)
                : 2;
        for (let i = 0; i < steps.length; i += 1) {
            if (i < failIdx) steps[i].variant = "done";
            else if (i === failIdx) steps[i].variant = "error";
            else steps[i].variant = "pending";
        }
        return steps;
    }

    if (currentStatus === FIAT_TO_CRYPTO_ORDER_STATUS.COMPLETED) {
        for (let i = 0; i < steps.length; i += 1) {
            steps[i].variant = "done";
        }
        return steps;
    }

    const idx = USER_ORDER_TIMELINE_STATUS_ORDER.indexOf(currentStatus);
    const activeIdx = idx === -1 ? 0 : idx;

    for (let i = 0; i < steps.length; i += 1) {
        if (i < activeIdx) steps[i].variant = "done";
        else if (i === activeIdx) steps[i].variant = "active";
        else steps[i].variant = "pending";
    }

    return steps;
};

/**
 * @param {{ status: string, failureCode?: string | null, failureMessage?: string | null, id?: string }} order
 * @returns {{ title: string, body: string, nextSteps: string[] } | null}
 */
export const getUserFacingFailureGuidance = (order) => {
    if (order.status !== FIAT_TO_CRYPTO_ORDER_STATUS.FAILED) return null;

    const code = order.failureCode ?? "";
    const ref = order.id ? `Reference: ${order.id}.` : "";

    const complianceKyc = [
        COMPLIANCE_BLOCK_REASON_CODES.KYC_NOT_VERIFIED,
        COMPLIANCE_BLOCK_REASON_CODES.KYC_REJECTED,
        COMPLIANCE_BLOCK_REASON_CODES.KYC_EXPIRED,
    ];

    if (complianceKyc.some((c) => code === c)) {
        return {
            title: "Identity verification required",
            body: "We could not continue this purchase under our compliance rules.",
            nextSteps: [
                "Open your account settings and complete or refresh identity verification.",
                "If you believe this is a mistake, contact support with your order reference.",
                ref || "Have your order confirmation email ready when you contact us.",
            ].filter(Boolean),
        };
    }

    if (
        code === COMPLIANCE_BLOCK_REASON_CODES.AML_BLOCKED ||
        code === COMPLIANCE_BLOCK_REASON_CODES.AML_PENDING_REVIEW ||
        code === COMPLIANCE_BLOCK_REASON_CODES.AML_SCREENING_ERROR
    ) {
        return {
            title: "Additional review needed",
            body: "Our compliance checks need more time or could not clear this request automatically.",
            nextSteps: [
                "Watch for an email from our compliance team with next steps.",
                "Do not send additional funds until support confirms how to proceed.",
                ref || "Contact support if nothing arrives within one business day.",
            ].filter(Boolean),
        };
    }

    if (
        code === COMPLIANCE_BLOCK_REASON_CODES.SANCTIONS_MATCH ||
        code === COMPLIANCE_BLOCK_REASON_CODES.SANCTIONS_PENDING_REVIEW ||
        code === COMPLIANCE_BLOCK_REASON_CODES.SANCTIONS_SCREENING_ERROR
    ) {
        return {
            title: "Screening could not complete",
            body: "We cannot process this transfer based on the screening outcome.",
            nextSteps: [
                "Check your email for a secure message from support.",
                "If funds were taken in error, support will outline refund or resolution options.",
                ref,
            ].filter(Boolean),
        };
    }

    return {
        title: "We could not finish this order",
        body: order.failureMessage?.trim() || "Something went wrong while processing your request.",
        nextSteps: [
            "Contact support with your order reference.",
            "If payment left your bank, do not place a duplicate order until support responds.",
            ref,
        ].filter(Boolean),
    };
};

/**
 * @param {import("./fiatToCryptoOrder.js").FiatToCryptoOrder & { deliveredAssetAmount?: string, deliveredAssetCode?: string }} order
 * @returns {{ headline: string, deliveredLine: string, transactionReference: string | null, footnote?: string } | null}
 */
export const buildCompletedOrderDeliverySummary = (order) => {
    if (order.status !== FIAT_TO_CRYPTO_ORDER_STATUS.COMPLETED) return null;

    const asset = (order.deliveredAssetCode ?? order.targetAssetCode ?? "").toUpperCase();
    const amount = order.deliveredAssetAmount?.trim();
    const tx = order.transferTxHash?.trim() ?? null;

    if (!amount) {
        return {
            headline: "Order complete",
            deliveredLine: `Delivered amount for ${asset || "your asset"} will appear in your confirmation shortly.`,
            transactionReference: tx,
            footnote: tx
                ? undefined
                : "Transaction reference will be added once the payout is confirmed on-chain.",
        };
    }

    const deliveredLine = `Delivered: ${amount} ${asset}`.trim();

    return {
        headline: "Order complete",
        deliveredLine,
        transactionReference: tx,
        footnote: tx ? undefined : "Save your wallet history; a transaction id was not stored on this order.",
    };
};
