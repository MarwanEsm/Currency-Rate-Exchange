import { ADMIN_ROLE } from "./adminPermissions";
import {
    ADMIN_DECISION,
    ADMIN_DECISION_ERROR_CODES,
    applyAdminDecisionToPaidOrder,
    getAdminDecisionAuditLogSnapshot,
    resetAdminDecisionAuditLogForTests,
    selectPendingExecutableOrders,
} from "./fiatToCryptoAdminQueue";
import { COMPLIANCE_CHECK_STATUS, KYC_VERIFICATION_STATUS } from "./fiatToCryptoCompliance";
import { FIAT_TO_CRYPTO_ORDER_STATUS } from "./fiatToCryptoOrder";

const paidOrderFixture = (overrides = {}) => ({
    id: "order-1",
    userId: "user-1",
    fiatCurrency: "USD",
    fiatAmount: "100.00",
    targetAssetCode: "BTC",
    walletAddress: "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
    network: "bitcoin_mainnet",
    status: FIAT_TO_CRYPTO_ORDER_STATUS.PAID,
    createdAt: "2026-04-20T10:00:00.000Z",
    updatedAt: "2026-04-20T10:05:00.000Z",
    submittedAt: "2026-04-20T10:00:00.000Z",
    paidAt: "2026-04-20T10:05:00.000Z",
    ...overrides,
});

const okCompliance = {
    kycVerificationStatus: KYC_VERIFICATION_STATUS.VERIFIED,
    amlCheckStatus: COMPLIANCE_CHECK_STATUS.CLEARED,
    sanctionsCheckStatus: COMPLIANCE_CHECK_STATUS.CLEARED,
};

const adminInput = (overrides = {}) => ({
    order: paidOrderFixture(),
    decision: ADMIN_DECISION.APPROVE,
    reason: "Reviewed statement + deposit receipt, all matches.",
    adminUserId: "admin-1",
    adminRoles: [ADMIN_ROLE.ORDER_REVIEWER],
    complianceContext: okCompliance,
    occurredAt: "2026-04-20T11:00:00.000Z",
    ...overrides,
});

describe("selectPendingExecutableOrders", () => {
    it("returns only orders in `paid`", () => {
        const orders = [
            paidOrderFixture({ id: "a" }),
            paidOrderFixture({ id: "b", status: FIAT_TO_CRYPTO_ORDER_STATUS.SUBMITTED }),
            paidOrderFixture({ id: "c", status: FIAT_TO_CRYPTO_ORDER_STATUS.PURCHASING }),
            paidOrderFixture({ id: "d" }),
        ];
        const pending = selectPendingExecutableOrders(orders);
        expect(pending.map((o) => o.id)).toEqual(["a", "d"]);
    });

    it("handles non-array input safely", () => {
        expect(selectPendingExecutableOrders(null)).toEqual([]);
    });
});

describe("applyAdminDecisionToPaidOrder", () => {
    beforeEach(() => {
        resetAdminDecisionAuditLogForTests();
    });

    it("approves a paid order and moves it to purchasing", () => {
        const result = applyAdminDecisionToPaidOrder(adminInput());
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.orderPatch.status).toBe(FIAT_TO_CRYPTO_ORDER_STATUS.PURCHASING);
        expect(result.orderPatch.purchasingAt).toBe("2026-04-20T11:00:00.000Z");
        expect(result.orderPatch.lastUpdatedBy).toBe("admin-1");
        expect(result.audit.outcome).toBe("applied");
        expect(result.audit.decision).toBe("approve");
        expect(getAdminDecisionAuditLogSnapshot()).toHaveLength(1);
    });

    it("rejects a paid order and moves it to failed with reason as message", () => {
        const result = applyAdminDecisionToPaidOrder(
            adminInput({ decision: ADMIN_DECISION.REJECT, reason: "Deposit mismatch — different name." }),
        );
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.orderPatch.status).toBe(FIAT_TO_CRYPTO_ORDER_STATUS.FAILED);
        expect(result.orderPatch.failureCode).toBe("admin_rejected");
        expect(result.orderPatch.failureMessage).toMatch(/deposit mismatch/i);
        expect(result.orderPatch.failedAt).toBe("2026-04-20T11:00:00.000Z");
        expect(result.audit.outcome).toBe("applied");
        expect(result.audit.decision).toBe("reject");
    });

    it("denies when caller lacks DECIDE_ORDER_APPROVAL permission", () => {
        const result = applyAdminDecisionToPaidOrder(adminInput({ adminRoles: [ADMIN_ROLE.READ_ONLY_AUDITOR] }));
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.errorCode).toBe(ADMIN_DECISION_ERROR_CODES.PERMISSION_DENIED);
        expect(getAdminDecisionAuditLogSnapshot()).toHaveLength(0);
    });

    it("denies when adminUserId is empty", () => {
        const result = applyAdminDecisionToPaidOrder(adminInput({ adminUserId: "" }));
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.errorCode).toBe(ADMIN_DECISION_ERROR_CODES.PERMISSION_DENIED);
    });

    it("rejects empty / too-short reason", () => {
        const result = applyAdminDecisionToPaidOrder(adminInput({ reason: "x" }));
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.errorCode).toBe(ADMIN_DECISION_ERROR_CODES.REASON_REQUIRED);
    });

    it("rejects invalid decision string", () => {
        const result = applyAdminDecisionToPaidOrder(adminInput({ decision: "maybe" }));
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.errorCode).toBe(ADMIN_DECISION_ERROR_CODES.INVALID_DECISION);
    });

    it("errors if the order is missing", () => {
        const result = applyAdminDecisionToPaidOrder(adminInput({ order: null }));
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.errorCode).toBe(ADMIN_DECISION_ERROR_CODES.ORDER_NOT_FOUND);
    });

    it("errors if the order is not in paid status", () => {
        const result = applyAdminDecisionToPaidOrder(
            adminInput({ order: paidOrderFixture({ status: FIAT_TO_CRYPTO_ORDER_STATUS.SUBMITTED }) }),
        );
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.errorCode).toBe(ADMIN_DECISION_ERROR_CODES.ORDER_NOT_PENDING_APPROVAL);
    });

    it("blocks approval when compliance gate rejects (AML blocked)", () => {
        const result = applyAdminDecisionToPaidOrder(
            adminInput({
                complianceContext: {
                    ...okCompliance,
                    amlCheckStatus: COMPLIANCE_CHECK_STATUS.BLOCKED,
                },
            }),
        );
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.errorCode).toBe(ADMIN_DECISION_ERROR_CODES.COMPLIANCE_BLOCKED);
        expect(result.complianceReasonCodes?.length).toBeGreaterThan(0);
        const log = getAdminDecisionAuditLogSnapshot();
        expect(log).toHaveLength(1);
        expect(log[0].outcome).toBe("blocked");
        expect(log[0].newStatus).toBe(FIAT_TO_CRYPTO_ORDER_STATUS.PAID);
    });

    it("appends an audit entry for each attempted decision", () => {
        applyAdminDecisionToPaidOrder(adminInput());
        applyAdminDecisionToPaidOrder(
            adminInput({
                decision: ADMIN_DECISION.REJECT,
                reason: "Customer asked to cancel before approval.",
            }),
        );
        const log = getAdminDecisionAuditLogSnapshot();
        expect(log).toHaveLength(2);
        expect(log[0].decision).toBe("approve");
        expect(log[1].decision).toBe("reject");
    });
});
