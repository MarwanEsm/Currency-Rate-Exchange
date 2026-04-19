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
});
