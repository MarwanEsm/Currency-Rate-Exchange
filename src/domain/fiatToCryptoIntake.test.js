import { resetComplianceAuditLogForTests } from "./fiatToCryptoCompliance";
import {
    buildSubmittedFiatToCryptoOrder,
    normalizeFiatToCryptoIntakeBody,
    validateFiatToCryptoIntakePayload,
} from "./fiatToCryptoIntake";
import { FIAT_TO_CRYPTO_ORDER_STATUS } from "./fiatToCryptoOrder";

describe("fiatToCryptoIntake (FCX-25)", () => {
    beforeEach(() => {
        resetComplianceAuditLogForTests();
    });

    const validBody = () => ({
        userId: "uid-test-1",
        fiatCurrency: "USD",
        fiatAmount: "150.00",
        targetAssetCode: "BTC",
        walletAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        network: "bitcoin_mainnet",
        kycVerificationStatus: "verified",
    });

    it("rejects non-objects", () => {
        expect(validateFiatToCryptoIntakePayload(null).ok).toBe(false);
    });

    it("accepts a well-formed intake payload", () => {
        const r = validateFiatToCryptoIntakePayload(validBody());
        expect(r.ok).toBe(true);
        if (r.ok) {
            expect(r.normalized.network).toBe("bitcoin_mainnet");
            expect(r.normalized.targetAssetCode).toBe("BTC");
        }
    });

    it("rejects invalid payout address for network", () => {
        const r = validateFiatToCryptoIntakePayload({
            ...validBody(),
            walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        });
        expect(r.ok).toBe(false);
    });

    it("rejects non-verified KYC", () => {
        const r = validateFiatToCryptoIntakePayload({
            ...validBody(),
            kycVerificationStatus: "pending",
        });
        expect(r.ok).toBe(false);
        if (!r.ok) {
            expect(r.errors.some((e) => /kyc/i.test(e))).toBe(true);
        }
    });

    it("builds a submitted order with id", () => {
        const v = validateFiatToCryptoIntakePayload(validBody());
        expect(v.ok).toBe(true);
        if (!v.ok) return;
        const order = buildSubmittedFiatToCryptoOrder(v.normalized, "ord-fixed");
        expect(order.status).toBe(FIAT_TO_CRYPTO_ORDER_STATUS.SUBMITTED);
        expect(order.id).toBe("ord-fixed");
        expect(order.submittedAt).toBeDefined();
    });

    it("normalizes numeric fiat amount to string", () => {
        const n = normalizeFiatToCryptoIntakeBody({
            ...validBody(),
            fiatAmount: 200,
        });
        expect(n?.fiatAmount).toBe("200");
    });

    it("threads exchangeRate + commissionConfig through validation (FCX-22)", () => {
        const r = validateFiatToCryptoIntakePayload({
            ...validBody(),
            exchangeRate: "0.00002",
            commissionConfig: { type: "fixed", fixedFiat: "1.00" },
        });
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.normalized.exchangeRate).toBe("0.00002");
        expect(r.normalized.commissionConfig).toEqual({ type: "fixed", fixedFiat: "1.00" });
    });

    it("rejects an invalid commissionConfig in the payload (FCX-22)", () => {
        const r = validateFiatToCryptoIntakePayload({
            ...validBody(),
            commissionConfig: { type: "fixed" },
        });
        expect(r.ok).toBe(false);
    });

    it("rejects a non-positive exchangeRate (FCX-22)", () => {
        const r = validateFiatToCryptoIntakePayload({
            ...validBody(),
            exchangeRate: "0",
        });
        expect(r.ok).toBe(false);
    });

    it("persists pricing fields on a submitted order when exchangeRate is supplied (FCX-22)", () => {
        const v = validateFiatToCryptoIntakePayload({
            ...validBody(),
            exchangeRate: "0.00002",
        });
        expect(v.ok).toBe(true);
        if (!v.ok) return;
        const order = buildSubmittedFiatToCryptoOrder(v.normalized, "ord-priced", {
            computedAt: "2026-04-23T12:00:00.000Z",
        });
        expect(order.grossFiatAmount).toBe("150.00");
        expect(order.feeFiatAmount).toBe("2.75");
        expect(order.netFiatAmount).toBe("147.25");
        expect(order.netCryptoAmount).toBe("0.00294500");
        expect(order.netCryptoAssetCode).toBe("BTC");
        expect(order.exchangeRateApplied).toBe("0.00002");
        expect(order.commissionConfigSnapshot).toBeDefined();
        expect(order.pricingComputedAt).toBe("2026-04-23T12:00:00.000Z");
    });

    it("omits pricing fields on a submitted order when no exchangeRate is supplied", () => {
        const v = validateFiatToCryptoIntakePayload(validBody());
        expect(v.ok).toBe(true);
        if (!v.ok) return;
        const order = buildSubmittedFiatToCryptoOrder(v.normalized, "ord-unpriced");
        expect(order.netCryptoAmount).toBeUndefined();
        expect(order.feeFiatAmount).toBeUndefined();
    });
});
