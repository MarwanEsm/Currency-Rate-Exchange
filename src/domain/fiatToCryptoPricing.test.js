import {
    ASSET_PRECISION,
    COMMISSION_MODEL_TYPE,
    DEFAULT_COMMISSION_CONFIG,
    buildOrderPricingPatch,
    computeFiatToCryptoQuote,
    validateCommissionConfig,
} from "./fiatToCryptoPricing";

const baseInput = (overrides = {}) => ({
    fiatAmount: "100.00",
    fiatCurrency: "USD",
    targetAssetCode: "BTC",
    exchangeRate: "0.00002",
    commissionConfig: DEFAULT_COMMISSION_CONFIG,
    computedAt: "2026-04-23T12:00:00.000Z",
    ...overrides,
});

describe("validateCommissionConfig", () => {
    it("accepts the default hybrid config", () => {
        expect(validateCommissionConfig(DEFAULT_COMMISSION_CONFIG)).toEqual([]);
    });

    it("accepts a fixed-only config without percentageBps", () => {
        expect(
            validateCommissionConfig({ type: COMMISSION_MODEL_TYPE.FIXED, fixedFiat: "2.50" }),
        ).toEqual([]);
    });

    it("accepts a percentage-only config without fixedFiat", () => {
        expect(
            validateCommissionConfig({ type: COMMISSION_MODEL_TYPE.PERCENTAGE, percentageBps: 100 }),
        ).toEqual([]);
    });

    it("rejects unknown type", () => {
        const errs = validateCommissionConfig({ type: "tiered", fixedFiat: "1.00" });
        expect(errs.join(" ")).toMatch(/type must be one of/);
    });

    it("rejects non-integer or out-of-range percentageBps", () => {
        expect(
            validateCommissionConfig({ type: COMMISSION_MODEL_TYPE.PERCENTAGE, percentageBps: 1.5 }),
        ).not.toEqual([]);
        expect(
            validateCommissionConfig({ type: COMMISSION_MODEL_TYPE.PERCENTAGE, percentageBps: 20000 }),
        ).not.toEqual([]);
    });

    it("rejects negative fixed fee", () => {
        expect(
            validateCommissionConfig({ type: COMMISSION_MODEL_TYPE.FIXED, fixedFiat: "-1.00" }),
        ).not.toEqual([]);
    });

    it("rejects min > max", () => {
        const errs = validateCommissionConfig({
            type: COMMISSION_MODEL_TYPE.PERCENTAGE,
            percentageBps: 100,
            minFiat: "5.00",
            maxFiat: "2.00",
        });
        expect(errs.join(" ")).toMatch(/minFiat must be <= maxFiat/);
    });
});

describe("computeFiatToCryptoQuote", () => {
    it("computes gross, fee, net and netCrypto for the default hybrid config (100 USD @ 0.00002 BTC/USD)", () => {
        const q = computeFiatToCryptoQuote(baseInput());
        expect(q.grossFiatAmount).toBe("100.00");
        expect(q.feeFiatAmount).toBe("2.00");
        expect(q.netFiatAmount).toBe("98.00");
        expect(q.netCryptoAmount).toBe("0.00196000");
        expect(q.netCryptoAssetCode).toBe("BTC");
        expect(q.fiatCurrency).toBe("USD");
        expect(q.commissionConfigSnapshot).toEqual(DEFAULT_COMMISSION_CONFIG);
        expect(q.pricingComputedAt).toBe("2026-04-23T12:00:00.000Z");
        expect(q.warnings).toEqual([]);
    });

    it("applies a min floor", () => {
        const q = computeFiatToCryptoQuote(
            baseInput({
                fiatAmount: "10.00",
                commissionConfig: {
                    type: COMMISSION_MODEL_TYPE.PERCENTAGE,
                    percentageBps: 100,
                    minFiat: "1.50",
                },
            }),
        );
        expect(q.feeFiatAmount).toBe("1.50");
        expect(q.netFiatAmount).toBe("8.50");
    });

    it("applies a max cap", () => {
        const q = computeFiatToCryptoQuote(
            baseInput({
                fiatAmount: "10000.00",
                commissionConfig: {
                    type: COMMISSION_MODEL_TYPE.PERCENTAGE,
                    percentageBps: 100,
                    maxFiat: "25.00",
                },
            }),
        );
        expect(q.feeFiatAmount).toBe("25.00");
        expect(q.netFiatAmount).toBe("9975.00");
    });

    it("supports a fixed-only config", () => {
        const q = computeFiatToCryptoQuote(
            baseInput({
                commissionConfig: { type: COMMISSION_MODEL_TYPE.FIXED, fixedFiat: "3.50" },
            }),
        );
        expect(q.feeFiatAmount).toBe("3.50");
        expect(q.netFiatAmount).toBe("96.50");
    });

    it("never lets fee exceed gross and emits net_fiat_is_zero warning when they’re equal", () => {
        const q = computeFiatToCryptoQuote(
            baseInput({
                fiatAmount: "2.00",
                commissionConfig: { type: COMMISSION_MODEL_TYPE.FIXED, fixedFiat: "5.00" },
            }),
        );
        expect(q.feeFiatAmount).toBe("2.00");
        expect(q.netFiatAmount).toBe("0.00");
        expect(q.warnings).toContain("net_fiat_is_zero");
        expect(q.netCryptoAmount).toBe("0.00000000");
    });

    it("rounds crypto amount per asset precision (ETH = 8 decimals)", () => {
        const q = computeFiatToCryptoQuote(
            baseInput({
                targetAssetCode: "ETH",
                exchangeRate: "0.000333333333",
                fiatAmount: "150.00",
                commissionConfig: { type: COMMISSION_MODEL_TYPE.FIXED, fixedFiat: "0.00" },
            }),
        );
        expect(q.netCryptoAmount.split(".")[1].length).toBe(ASSET_PRECISION.ETH.decimals);
    });

    it("rounds USDC to 2 decimals", () => {
        const q = computeFiatToCryptoQuote(
            baseInput({
                targetAssetCode: "USDC",
                exchangeRate: "1",
                fiatAmount: "50.00",
                commissionConfig: { type: COMMISSION_MODEL_TYPE.FIXED, fixedFiat: "0.25" },
            }),
        );
        expect(q.netFiatAmount).toBe("49.75");
        expect(q.netCryptoAmount).toBe("49.75");
    });

    it("flags dust for a tiny BTC output", () => {
        const q = computeFiatToCryptoQuote(
            baseInput({
                fiatAmount: "1.01",
                exchangeRate: "0.000001",
                commissionConfig: { type: COMMISSION_MODEL_TYPE.FIXED, fixedFiat: "1.00" },
            }),
        );
        expect(q.warnings).toContain("net_crypto_below_dust_threshold");
    });

    it("rejects zero gross or zero rate", () => {
        expect(() => computeFiatToCryptoQuote(baseInput({ fiatAmount: "0.00" }))).toThrow(/greater than zero/);
        expect(() => computeFiatToCryptoQuote(baseInput({ exchangeRate: "0" }))).toThrow(/greater than zero/);
    });

    it("rejects invalid inputs", () => {
        expect(() => computeFiatToCryptoQuote(baseInput({ fiatAmount: "abc" }))).toThrow();
        expect(() => computeFiatToCryptoQuote(baseInput({ exchangeRate: "-1" }))).toThrow();
        expect(() => computeFiatToCryptoQuote(baseInput({ fiatCurrency: "" }))).toThrow();
        expect(() => computeFiatToCryptoQuote(baseInput({ targetAssetCode: "" }))).toThrow();
    });
});

describe("buildOrderPricingPatch", () => {
    it("includes every persisted pricing field and warnings when present", () => {
        const q = computeFiatToCryptoQuote(
            baseInput({
                fiatAmount: "2.00",
                commissionConfig: { type: COMMISSION_MODEL_TYPE.FIXED, fixedFiat: "5.00" },
            }),
        );
        const patch = buildOrderPricingPatch(q);
        expect(patch).toEqual(
            expect.objectContaining({
                grossFiatAmount: "2.00",
                feeFiatAmount: "2.00",
                netFiatAmount: "0.00",
                exchangeRateApplied: "0.00002",
                netCryptoAmount: "0.00000000",
                netCryptoAssetCode: "BTC",
                pricingComputedAt: "2026-04-23T12:00:00.000Z",
            }),
        );
        expect(patch.pricingWarnings).toContain("net_fiat_is_zero");
        expect(patch.commissionConfigSnapshot).toEqual({
            type: COMMISSION_MODEL_TYPE.FIXED,
            fixedFiat: "5.00",
        });
    });

    it("omits pricingWarnings when there are none", () => {
        const q = computeFiatToCryptoQuote(baseInput());
        const patch = buildOrderPricingPatch(q);
        expect(patch.pricingWarnings).toBeUndefined();
    });
});
