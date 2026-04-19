import {
    convertAmountWithRate,
    formatWholeAmountForDisplay,
    parseDigitsAmount,
    sanitizeAmountDigitString,
} from "./convertCurrencyAmount";

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

describe("sanitizeAmountDigitString", () => {
    it("strips non-digits and caps length", () => {
        expect(sanitizeAmountDigitString("12a34")).toBe("1234");
        expect(sanitizeAmountDigitString("1-2")).toBe("12");
        expect(sanitizeAmountDigitString("x")).toBe("");
        const long = "9".repeat(30);
        expect(sanitizeAmountDigitString(long).length).toBe(15);
    });
});

describe("formatWholeAmountForDisplay", () => {
    it("returns empty for invalid or empty input", () => {
        expect(formatWholeAmountForDisplay("")).toBe("");
        expect(formatWholeAmountForDisplay("  ")).toBe("");
    });

    it("groups whole numbers without changing the underlying digit string used for math", () => {
        const formatted = formatWholeAmountForDisplay("1000");
        expect(formatted).toMatch(/000/);
        expect(formatted.length).toBeGreaterThanOrEqual(4);
        expect(parseDigitsAmount("1000")).toBe(1000);
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

    it("treats zero amount as a valid conversion", () => {
        expect(convertAmountWithRate(0, 1.234567)).toBe(0);
    });

    it("returns null when the product is not finite", () => {
        expect(convertAmountWithRate(Number.MAX_VALUE, Number.MAX_VALUE)).toBeNull();
    });
});
