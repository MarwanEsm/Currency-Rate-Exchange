import {
    buildIndicativeFiatToCryptoQuote,
    pickProviderRateForAsset,
    validateFiatToCryptoQuotePreviewInput,
} from "@/domain/fiatToCryptoQuotePreview";
import { getExchangeRates } from "@/services/exchangeRateProvider";

/**
 * GET /api/fiat-to-crypto/quote-preview — indicative fiat → crypto (no auth).
 * Query: fiatCurrency, fiatAmount, targetAssetCode
 *
 * Combines Coinbase spot rates with default commission rules; not a binding quote.
 */
export default async function handler(req, res) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({ error: "Method not allowed" });
    }

    const fiatCurrency = typeof req.query.fiatCurrency === "string" ? req.query.fiatCurrency : "";
    const fiatAmount = typeof req.query.fiatAmount === "string" ? req.query.fiatAmount : "";
    const targetAssetCode = typeof req.query.targetAssetCode === "string" ? req.query.targetAssetCode : "";

    const validationErrors = validateFiatToCryptoQuotePreviewInput(fiatCurrency, fiatAmount, targetAssetCode);
    if (validationErrors.length > 0) {
        return res.status(400).json({ errors: validationErrors });
    }

    const fc = fiatCurrency.trim().toUpperCase();
    const fa = fiatAmount.trim();
    const tac = targetAssetCode.trim().toUpperCase();

    try {
        const snapshot = await getExchangeRates(fc);
        const rateStr = pickProviderRateForAsset(snapshot.rates, tac);
        if (rateStr === null) {
            return res.status(404).json({
                error: "rate_not_available",
                message: `No ${tac} rate in the provider response for base ${fc}.`,
            });
        }

        const quote = buildIndicativeFiatToCryptoQuote({
            fiatCurrency: fc,
            fiatAmount: fa,
            targetAssetCode: tac,
            providerRateString: rateStr,
        });

        return res.status(200).json({
            indicative: true,
            disclaimer:
                "Indicative only. Final amounts are set when you submit a request and when operations lock pricing.",
            fiatCurrency: fc,
            fiatAmount: fa,
            targetAssetCode: tac,
            providerSpotCryptoPerFiat: rateStr,
            fetchedAt: snapshot.fetchedAt,
            quote: {
                grossFiatAmount: quote.grossFiatAmount,
                feeFiatAmount: quote.feeFiatAmount,
                netFiatAmount: quote.netFiatAmount,
                netCryptoAmount: quote.netCryptoAmount,
                netCryptoAssetCode: quote.netCryptoAssetCode,
                exchangeRateApplied: quote.exchangeRateApplied,
                pricingWarnings: quote.warnings,
            },
        });
    } catch (e) {
        const message = e && typeof e === "object" && "message" in e ? String(e.message) : "Rate fetch failed.";
        return res.status(502).json({
            error: "rate_provider_failed",
            message,
        });
    }
}
