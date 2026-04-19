/**
 * Parses a digits-only amount string from the conversion field.
 * Empty or non-finite values return null so they are never confused with 0.
 *
 * @param {string | null | undefined} amountString
 * @returns {number | null}
 */
export const parseDigitsAmount = (amountString) => {
    if (amountString === null || amountString === undefined) return null;
    const trimmed = String(amountString).trim();
    if (trimmed === "") return null;
    if (!/^\d+$/.test(trimmed)) return null;
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return null;
    return n;
};

/**
 * Converts an amount using an exchange rate, rounded half-up to 2 decimal places.
 *
 * @param {number} amount
 * @param {number} rate
 * @returns {number | null}
 */
export const convertAmountWithRate = (amount, rate) => {
    if (!Number.isFinite(amount) || !Number.isFinite(rate)) return null;
    const product = amount * rate;
    if (!Number.isFinite(product)) return null;
    return Math.round(product * 100) / 100;
};
