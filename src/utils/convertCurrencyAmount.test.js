import { convertAmountWithRate, parseDigitsAmount } from "./convertCurrencyAmount";

describe("parseDigitsAmount", () => {
    it("returns null for empty input so it is not treated as zero", () => {
        expect(parseDigitsAmount("")).toBeNull();
        expect(parseDigitsAmount("   ")).toBeNull();
    });

    it("parses digit-only positive amounts", () => {
        expect(parseDigitsAmount("100")).toBe(100);
        expect(parseDigitsAmount("0")).toBe(0);
        expect(parseDigitsAmount("010")).toBe(10);
    });

    it("rejects values that are not whole digit strings", () => {
        expect(parseDigitsAmount("-1")).toBeNull();
        expect(parseDigitsAmount("12.5")).toBeNull();
        expect(parseDigitsAmount("1e6")).toBeNull();
    });
});

describe("convertAmountWithRate", () => {
    it("multiplies and rounds to two decimal places", () => {
        expect(convertAmountWithRate(10, 1.234567)).toBe(12.35);
        expect(convertAmountWithRate(1, 0.912345)).toBe(0.91);
    });

    it("returns null when inputs are not finite", () => {
        expect(convertAmountWithRate(NaN, 1)).toBeNull();
        expect(convertAmountWithRate(1, NaN)).toBeNull();
        expect(convertAmountWithRate(1, null)).toBeNull();
    });
});
