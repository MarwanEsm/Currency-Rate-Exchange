/**
 * FCX-43 — decision audit log endpoint for the admin review queue.
 */
import { ADMIN_ROLE } from "@/domain/adminPermissions";
import {
    ADMIN_DECISION,
    applyAdminDecisionToPaidOrder,
    getAdminDecisionAuditLogSnapshot,
    resetAdminDecisionAuditLogForTests,
} from "@/domain/fiatToCryptoAdminQueue";
import { COMPLIANCE_CHECK_STATUS, KYC_VERIFICATION_STATUS, resetComplianceAuditLogForTests } from "@/domain/fiatToCryptoCompliance";
import { FIAT_TO_CRYPTO_ORDER_STATUS } from "@/domain/fiatToCryptoOrder";
import handler from "./log";

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

describe("GET /api/fiat-to-crypto/admin/decisions/log (FCX-43)", () => {
    beforeEach(() => {
        resetAdminDecisionAuditLogForTests();
        resetComplianceAuditLogForTests();
    });

    it("returns 403 without view_order_queue permission", async () => {
        const req = {
            method: "GET",
            headers: {
                "x-admin-user-id": "admin-1",
                "x-admin-roles": "",
            },
        };
        const res = makeRes();
        await handler(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns decision audit entries newest-first for authorized callers", async () => {
        const order = {
            id: "ord-audit",
            userId: "user-1",
            fiatCurrency: "USD",
            fiatAmount: "50.00",
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
        };
        applyAdminDecisionToPaidOrder({
            order,
            decision: ADMIN_DECISION.REJECT,
            reason: "Customer requested cancellation before approval.",
            adminUserId: "admin-1",
            adminRoles: [ADMIN_ROLE.ORDER_REVIEWER],
            occurredAt: "2026-04-20T12:00:00.000Z",
        });
        expect(getAdminDecisionAuditLogSnapshot()).toHaveLength(1);

        const req = {
            method: "GET",
            headers: {
                "x-admin-user-id": "admin-1",
                "x-admin-roles": ADMIN_ROLE.READ_ONLY_AUDITOR,
            },
        };
        const res = makeRes();
        await handler(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        const body = res.payload;
        expect(Array.isArray(body.entries)).toBe(true);
        expect(body.entries.length).toBe(1);
        expect(body.entries[0].decision).toBe("reject");
        expect(body.entries[0].orderId).toBe("ord-audit");
    });
});
