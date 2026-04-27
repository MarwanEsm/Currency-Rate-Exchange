/**
 * FCX-47 — Full happy-path fulfillment against in-memory persistence (no HTTP).
 * Covers: submit → deposit match → admin approve + locked pricing → execution → payout broadcast → complete,
 * plus notification triggers and representative audit buffers.
 */

import { ADMIN_ROLE } from "@/domain/adminPermissions";
import {
    ADMIN_DECISION,
    applyAdminDecisionToPaidOrder,
    getAdminDecisionAuditLogSnapshot,
    resetAdminDecisionAuditLogForTests,
} from "@/domain/fiatToCryptoAdminQueue";
import { COMPLIANCE_CHECK_STATUS, resetComplianceAuditLogForTests } from "@/domain/fiatToCryptoCompliance";
import {
    DEPOSIT_RECONCILIATION_OUTCOME,
    __clearDepositReconciliationAuditForTests,
    getDepositReconciliationAuditLogSnapshot,
    reconcileDeposit,
} from "@/domain/fiatToCryptoDeposit";
import {
    buildExecutionOrderPatch,
    executePurchaseWithRetry,
    getPurchaseExecutionAuditLogSnapshot,
    resetPurchaseExecutionAuditLogForTests,
} from "@/domain/fiatToCryptoExecution";
import { buildSubmittedFiatToCryptoOrder, validateFiatToCryptoIntakePayload } from "@/domain/fiatToCryptoIntake";
import { FIAT_TO_CRYPTO_ORDER_STATUS } from "@/domain/fiatToCryptoOrder";
import {
    ORDER_PROGRESS_NOTIFICATION_TRIGGER,
    getOrderProgressNotificationEventsForOrder,
    resetOrderProgressNotificationLogForTests,
} from "@/domain/fiatToCryptoOrderProgress";
import { buildOrderPricingPatch, computeFiatToCryptoQuote, DEFAULT_COMMISSION_CONFIG } from "@/domain/fiatToCryptoPricing";
import { buildTransferBroadcastOrderPatch, buildTransferCompletedOrderPatch } from "@/domain/fiatToCryptoTransfer";
import {
    __clearInMemoryFiatToCryptoOrdersForTests,
    getFiatToCryptoOrderById,
    saveSubmittedFiatToCryptoOrder,
    updateFiatToCryptoOrder,
} from "@/server/inMemoryFiatToCryptoOrders";

describe("fiatToCrypto fulfillment E2E (FCX-47)", () => {
    const T0 = "2026-04-27T15:00:00.000Z";
    const clock = () => T0;

    beforeEach(() => {
        __clearInMemoryFiatToCryptoOrdersForTests();
        resetOrderProgressNotificationLogForTests();
        resetComplianceAuditLogForTests();
        resetAdminDecisionAuditLogForTests();
        resetPurchaseExecutionAuditLogForTests();
        __clearDepositReconciliationAuditForTests();
    });

    it("walks submitted → paid → purchasing → transferring → completed with audits and notifications", async () => {
        const orderId = "ord-fcx47-e2e-1";
        const intake = validateFiatToCryptoIntakePayload({
            userId: "user-fcx47",
            fiatCurrency: "USD",
            fiatAmount: "100.00",
            targetAssetCode: "BTC",
            walletAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
            kycVerificationStatus: "verified",
        });
        expect(intake.ok).toBe(true);

        const submitted = buildSubmittedFiatToCryptoOrder(intake.normalized, orderId, { computedAt: T0 });
        saveSubmittedFiatToCryptoOrder(submitted);

        const deposit = {
            id: "dep-fcx47-1",
            amount: "100.00",
            currency: "USD",
            reference: orderId,
            receivedAt: T0,
        };
        let order = getFiatToCryptoOrderById(orderId);
        const recon = reconcileDeposit({
            deposit,
            order,
            priorReconciledDepositIds: [],
            actor: "treasury-bot",
            notes: "fcx-47 e2e match",
            nowIso: clock,
            complianceScreening: {
                amlCheckStatus: COMPLIANCE_CHECK_STATUS.CLEARED,
                sanctionsCheckStatus: COMPLIANCE_CHECK_STATUS.CLEARED,
            },
        });
        expect(recon.outcome).toBe(DEPOSIT_RECONCILIATION_OUTCOME.MATCHED);
        expect(recon.orderPatch).toBeDefined();
        updateFiatToCryptoOrder(orderId, recon.orderPatch);

        order = getFiatToCryptoOrderById(orderId);
        expect(order.status).toBe(FIAT_TO_CRYPTO_ORDER_STATUS.PAID);

        const decision = applyAdminDecisionToPaidOrder({
            order,
            decision: ADMIN_DECISION.APPROVE,
            reason: "Cleared for FCX-47 fulfillment path.",
            adminUserId: "admin-fcx47",
            adminRoles: [ADMIN_ROLE.ORDER_REVIEWER],
            occurredAt: T0,
        });
        expect(decision.ok).toBe(true);

        const quote = computeFiatToCryptoQuote({
            fiatAmount: order.fiatAmount,
            fiatCurrency: order.fiatCurrency,
            targetAssetCode: order.targetAssetCode,
            exchangeRate: "50000",
            commissionConfig: DEFAULT_COMMISSION_CONFIG,
            computedAt: T0,
        });
        updateFiatToCryptoOrder(orderId, { ...decision.orderPatch, ...buildOrderPricingPatch(quote) });

        order = getFiatToCryptoOrderById(orderId);
        expect(order.status).toBe(FIAT_TO_CRYPTO_ORDER_STATUS.PURCHASING);
        expect(order.netCryptoAmount).toBeTruthy();

        const execResult = await executePurchaseWithRetry(order, {
            clock,
            uuidFactory: () => "uuid-exec-fcx47",
            actor: "executor",
        });
        expect(execResult.ok).toBe(true);
        updateFiatToCryptoOrder(orderId, buildExecutionOrderPatch(order, execResult, { now: T0, actor: "executor" }));

        order = getFiatToCryptoOrderById(orderId);
        expect(order.status).toBe(FIAT_TO_CRYPTO_ORDER_STATUS.TRANSFERRING);

        const broadcast = buildTransferBroadcastOrderPatch(order, {
            txHash: "a".repeat(64),
            actor: "custody",
        });
        expect(broadcast.ok).toBe(true);
        updateFiatToCryptoOrder(orderId, broadcast.patch);

        order = getFiatToCryptoOrderById(orderId);
        const completed = buildTransferCompletedOrderPatch(order, {
            deliveredAssetAmount: execResult.fillQuantity,
            actor: "custody",
            now: T0,
        });
        expect(completed.ok).toBe(true);
        updateFiatToCryptoOrder(orderId, completed.patch);

        order = getFiatToCryptoOrderById(orderId);
        expect(order.status).toBe(FIAT_TO_CRYPTO_ORDER_STATUS.COMPLETED);
        expect(order.transferTxHash?.trim()).toBeTruthy();

        const triggers = getOrderProgressNotificationEventsForOrder(orderId).map((e) => e.trigger);
        expect(triggers).toContain(ORDER_PROGRESS_NOTIFICATION_TRIGGER.ORDER_SUBMITTED);
        expect(triggers).toContain(ORDER_PROGRESS_NOTIFICATION_TRIGGER.PAYMENT_CONFIRMED);
        expect(triggers).toContain(ORDER_PROGRESS_NOTIFICATION_TRIGGER.PURCHASING_STARTED);
        expect(triggers).toContain(ORDER_PROGRESS_NOTIFICATION_TRIGGER.TRANSFER_STARTED);
        expect(triggers).toContain(ORDER_PROGRESS_NOTIFICATION_TRIGGER.DELIVERY_COMPLETED);

        expect(
            getDepositReconciliationAuditLogSnapshot().some((e) => e.outcome === DEPOSIT_RECONCILIATION_OUTCOME.MATCHED),
        ).toBe(true);
        expect(
            getAdminDecisionAuditLogSnapshot().some(
                (e) => e.decision === ADMIN_DECISION.APPROVE && e.outcome === "applied",
            ),
        ).toBe(true);
        expect(getPurchaseExecutionAuditLogSnapshot().some((e) => e.outcome === "success")).toBe(true);
    });
});
