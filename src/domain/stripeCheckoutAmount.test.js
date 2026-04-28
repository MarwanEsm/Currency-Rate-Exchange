import { wholeAmountToStripeMinorUnits } from "./stripeCheckoutAmount";

describe("stripeCheckoutAmount", () => {
    it("converts EUR whole units to cents", () => {
        const r = wholeAmountToStripeMinorUnits(10, "EUR");
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.minorUnits).toBe(1000);
    });

    it("rejects amounts below typical minimum for EUR", () => {
        const r = wholeAmountToStripeMinorUnits(0, "EUR");
        expect(r.ok).toBe(false);
    });

    it("treats JPY as zero-decimal", () => {
        const r = wholeAmountToStripeMinorUnits(100, "JPY");
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.minorUnits).toBe(100);
    });
});
