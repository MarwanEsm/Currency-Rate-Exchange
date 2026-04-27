/**
 * FCX-44 — purchase execution audit + provider list endpoints.
 */
import { ADMIN_ROLE } from "@/domain/adminPermissions";
import { COMPLIANCE_CHECK_STATUS, KYC_VERIFICATION_STATUS } from "@/domain/fiatToCryptoCompliance";
import {
    LIQUIDITY_PROVIDER_ID,
    executePurchaseWithRetry,
    resetPurchaseExecutionAuditLogForTests,
} from "@/domain/fiatToCryptoExecution";
import { FIAT_TO_CRYPTO_ORDER_STATUS } from "@/domain/fiatToCryptoOrder";
import logHandler from "./log";
import providersHandler from "./providers";

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

const purchasingOrder = () => ({
    id: "ord-exec",
    userId: "user-1",
    fiatCurrency: "USD",
    fiatAmount: "100.00",
    targetAssetCode: "BTC",
    walletAddress: "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
    network: "bitcoin_mainnet",
    kycVerificationStatus: KYC_VERIFICATION_STATUS.VERIFIED,
    amlCheckStatus: COMPLIANCE_CHECK_STATUS.CLEARED,
    sanctionsCheckStatus: COMPLIANCE_CHECK_STATUS.CLEARED,
    status: FIAT_TO_CRYPTO_ORDER_STATUS.PURCHASING,
    netCryptoAmount: "0.0015",
    netCryptoAssetCode: "BTC",
    exchangeRateApplied: "0.000015",
    createdAt: "2026-04-20T10:00:00.000Z",
    updatedAt: "2026-04-20T11:00:00.000Z",
});

describe("FCX-44 admin execution APIs", () => {
    beforeEach(() => {
        resetPurchaseExecutionAuditLogForTests();
    });

    it("GET execution/providers returns registered provider ids", async () => {
        const req = {
            method: "GET",
            headers: {
                "x-admin-user-id": "admin-1",
                "x-admin-roles": ADMIN_ROLE.READ_ONLY_AUDITOR,
            },
        };
        const res = makeRes();
        await providersHandler(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.payload.providers).toContain(LIQUIDITY_PROVIDER_ID.INTERNAL_SIMULATOR);
    });

    it("GET execution/log returns 403 without permission", async () => {
        const req = {
            method: "GET",
            headers: { "x-admin-user-id": "admin-1", "x-admin-roles": "" },
        };
        const res = makeRes();
        await logHandler(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it("GET execution/log returns attempts after executePurchaseWithRetry", async () => {
        await executePurchaseWithRetry(purchasingOrder(), {
            uuidFactory: () => "test-uuid-1",
            clock: () => "2026-04-20T12:00:00.000Z",
        });

        const req = {
            method: "GET",
            headers: {
                "x-admin-user-id": "admin-1",
                "x-admin-roles": ADMIN_ROLE.READ_ONLY_AUDITOR,
            },
        };
        const res = makeRes();
        await logHandler(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(Array.isArray(res.payload.entries)).toBe(true);
        expect(res.payload.entries.length).toBeGreaterThan(0);
        expect(res.payload.entries.some((e) => e.orderId === "ord-exec" && e.outcome === "success")).toBe(true);
    });
});
