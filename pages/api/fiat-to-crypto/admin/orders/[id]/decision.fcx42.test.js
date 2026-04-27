/**
 * FCX-42 — approve path requires a lockable quote before audit/persist; pricing fields land on the order.
 */
import { ADMIN_ROLE } from "@/domain/adminPermissions";
import {
    getAdminDecisionAuditLogSnapshot,
    resetAdminDecisionAuditLogForTests,
} from "@/domain/fiatToCryptoAdminQueue";
import { COMPLIANCE_CHECK_STATUS, KYC_VERIFICATION_STATUS, resetComplianceAuditLogForTests } from "@/domain/fiatToCryptoCompliance";
import { FIAT_TO_CRYPTO_ORDER_STATUS } from "@/domain/fiatToCryptoOrder";
import {
    __clearInMemoryFiatToCryptoOrdersForTests,
    getFiatToCryptoOrderById,
    saveSubmittedFiatToCryptoOrder,
} from "@/server/inMemoryFiatToCryptoOrders";
import handler from "./decision";

const paidOrder = () => ({
    id: "ord-fcx42",
    userId: "user-1",
    fiatCurrency: "USD",
    fiatAmount: "100.00",
    targetAssetCode: "BTC",
    walletAddress: "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
    network: "bitcoin_mainnet",
    kycVerificationStatus: KYC_VERIFICATION_STATUS.VERIFIED,
    amlCheckStatus: COMPLIANCE_CHECK_STATUS.CLEARED,
    sanctionsCheckStatus: COMPLIANCE_CHECK_STATUS.CLEARED,
    status: FIAT_TO_CRYPTO_ORDER_STATUS.PAID,
    createdAt: "2026-04-20T10:00:00.000Z",
    updatedAt: "2026-04-20T10:05:00.000Z",
    submittedAt: "2026-04-20T10:00:00.000Z",
    paidAt: "2026-04-20T10:05:00.000Z",
});

const makeRes = () => {
    const res = {};
    res.statusCode = 200;
    res.status = jest.fn((code) => {
        res.statusCode = code;
        return res;
    });
    res.json = jest.fn((payload) => {
        res.payload = payload;
        return res;
    });
    res.setHeader = jest.fn();
    return res;
};

describe("POST decision — FCX-42 pricing on approve", () => {
    beforeEach(() => {
        __clearInMemoryFiatToCryptoOrdersForTests();
        resetAdminDecisionAuditLogForTests();
        resetComplianceAuditLogForTests();
        saveSubmittedFiatToCryptoOrder(paidOrder());
    });

    it("returns 400 when approving without exchangeRate (no audit entry)", async () => {
        const req = {
            method: "POST",
            query: { id: "ord-fcx42" },
            headers: {
                "x-admin-user-id": "admin-1",
                "x-admin-roles": ADMIN_ROLE.ORDER_REVIEWER,
            },
            body: {
                decision: "approve",
                reason: "Verified deposit and compliance.",
            },
        };
        const res = makeRes();
        await handler(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json.mock.calls[0][0].error).toBe("exchange_rate_required");
        expect(getAdminDecisionAuditLogSnapshot()).toHaveLength(0);
    });

    it("persists gross/fee/net fiat and net crypto when approving with exchangeRate", async () => {
        const req = {
            method: "POST",
            query: { id: "ord-fcx42" },
            headers: {
                "x-admin-user-id": "admin-1",
                "x-admin-roles": ADMIN_ROLE.ORDER_REVIEWER,
            },
            body: {
                decision: "approve",
                reason: "Verified deposit and compliance.",
                exchangeRate: "0.000015",
            },
        };
        const res = makeRes();
        await handler(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        const updated = getFiatToCryptoOrderById("ord-fcx42");
        expect(updated?.status).toBe(FIAT_TO_CRYPTO_ORDER_STATUS.PURCHASING);
        expect(updated?.grossFiatAmount).toBe("100.00");
        expect(updated?.feeFiatAmount).toBeDefined();
        expect(updated?.netFiatAmount).toBeDefined();
        expect(updated?.netCryptoAmount).toBeDefined();
        expect(updated?.exchangeRateApplied).toBe("0.000015");
        expect(updated?.commissionConfigSnapshot).toBeDefined();
        expect(getAdminDecisionAuditLogSnapshot()).toHaveLength(1);
    });
});
