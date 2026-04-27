import {
    buildIndicativeFiatToCryptoQuote,
    pickProviderRateForAsset,
    validateFiatToCryptoQuotePreviewInput,
} from "./fiatToCryptoQuotePreview";

describe("fiatToCryptoQuotePreview", () => {
    describe("validateFiatToCryptoQuotePreviewInput", () => {
        it("accepts USD / EUR and supported assets", () => {
            expect(validateFiatToCryptoQuotePreviewInput("USD", "100.00", "BTC")).toEqual([]);
        });

        it("rejects bad fiat and amount", () => {
            expect(validateFiatToCryptoQuotePreviewInput("GBP", "10", "BTC").length).toBeGreaterThan(0);
            expect(validateFiatToCryptoQuotePreviewInput("USD", "0", "BTC").length).toBeGreaterThan(0);
            expect(validateFiatToCryptoQuotePreviewInput("USD", "-1", "BTC").length).toBeGreaterThan(0);
        });
    });

    describe("pickProviderRateForAsset", () => {
        it("finds rate case-insensitively", () => {
            expect(pickProviderRateForAsset({ BTC: "0.00002", eth: "0.0004" }, "BTC")).toBe("0.00002");
            expect(pickProviderRateForAsset({ BTC: "0.00002", eth: "0.0004" }, "ETH")).toBe("0.0004");
        });

        it("returns null when missing", () => {
            expect(pickProviderRateForAsset({ EUR: "1" }, "BTC")).toBe(null);
        });
    });

    describe("buildIndicativeFiatToCryptoQuote", () => {
        it("applies commission to provider spot rate", () => {
            const q = buildIndicativeFiatToCryptoQuote({
                fiatCurrency: "USD",
                fiatAmount: "100.00",
                targetAssetCode: "BTC",
                providerRateString: "0.00002",
            });
            expect(q.netCryptoAssetCode).toBe("BTC");
            expect(Number(q.netCryptoAmount)).toBeGreaterThan(0);
            expect(q.grossFiatAmount).toBe("100.00");
        });
    });
});
