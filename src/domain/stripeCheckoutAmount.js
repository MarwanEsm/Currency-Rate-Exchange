/**
 * Stripe Checkout expects amounts in the smallest currency unit (e.g. cents for EUR).
 * See https://docs.stripe.com/currencies
 */

/** ISO 4217 codes Stripe treats as zero-decimal (integer amount = smallest unit). */
export const STRIPE_ZERO_DECIMAL_CURRENCIES = Object.freeze(
    new Set([
        "BIF",
        "CLP",
        "DJF",
        "GNF",
        "JPY",
        "KMF",
        "KRW",
        "MGA",
        "PYG",
        "RWF",
        "UGX",
        "VND",
        "VUV",
        "XAF",
        "XOF",
        "XPF",
    ]),
);

/**
 * @param {number} amountWhole units (whole-number input from conversion UI).
 * @param {string} currencyIso Uppercase ISO 4217 code.
 * @returns {{ ok: true, minorUnits: number } | { ok: false, message: string }}
 */
export const wholeAmountToStripeMinorUnits = (amountWhole, currencyIso) => {
    const cur = String(currencyIso ?? "")
        .trim()
        .toUpperCase();
    if (!/^[A-Z]{3}$/.test(cur)) {
        return { ok: false, message: "Invalid currency code." };
    }
    if (!Number.isFinite(amountWhole) || amountWhole <= 0) {
        return { ok: false, message: "Amount must be a positive number." };
    }
    const roundedWhole = Math.round(Number(amountWhole));
    if (!Number.isFinite(roundedWhole) || roundedWhole <= 0) {
        return { ok: false, message: "Amount must be a positive number." };
    }

    let minorUnits;
    if (STRIPE_ZERO_DECIMAL_CURRENCIES.has(cur)) {
        minorUnits = roundedWhole;
    } else {
        minorUnits = roundedWhole * 100;
    }

    /** Stripe generally requires ≥ smallest currency unit; €0.50 → 50 minor units for EUR. */
    if (cur === "JPY") {
        if (minorUnits < 50) {
            return { ok: false, message: "Minimum charge for JPY is typically ¥50." };
        }
    } else if (minorUnits < 50) {
        return { ok: false, message: "Minimum charge is typically 0.50 in major currencies." };
    }

    return { ok: true, minorUnits };
};
