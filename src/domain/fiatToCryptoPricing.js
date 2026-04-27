/**
 * Commission & net-crypto calculation engine (FCX-22, FCX-42).
 *
 * Pure domain logic. BigInt-based decimal arithmetic keeps money math exact regardless of
 * floating-point quirks; the engine emits final values already rounded to the right precision
 * per asset (fiat 2 decimals, crypto per `ASSET_PRECISION`), plus a snapshot of every input so
 * ops and auditors can reconstruct each quote. **FCX-42** is the product story for configurable
 * commission (fixed / percentage / hybrid), persisted gross/fee/net, asset precision, and
 * pre-execution visibility via the admin pricing preview API and queue UI.
 */

export const COMMISSION_MODEL_TYPE = {
    FIXED: "fixed",
    PERCENTAGE: "percentage",
    HYBRID: "hybrid",
};

/**
 * Default precision per target crypto asset. `decimals` caps how many fractional digits land in
 * the persisted `netCryptoAmount`; `dustMinor` (integer in smallest units) is the minimum payable
 * amount — anything below that is treated as undeliverable "dust".
 *
 * @type {Readonly<Record<string, { decimals: number, dustMinor: bigint }>>}
 */
export const ASSET_PRECISION = Object.freeze({
    BTC: { decimals: 8, dustMinor: 546n },
    ETH: { decimals: 8, dustMinor: 1n },
    USDC: { decimals: 2, dustMinor: 1n },
    USDT: { decimals: 2, dustMinor: 1n },
});

const DEFAULT_ASSET_PRECISION = { decimals: 8, dustMinor: 1n };
const FIAT_DECIMALS = 2;
const INTERNAL_SCALE = 18;
const INTERNAL_DIVISOR = 10n ** BigInt(INTERNAL_SCALE);

/** @returns {{ decimals: number, dustMinor: bigint }} */
const getAssetPrecision = (assetCode) =>
    ASSET_PRECISION[String(assetCode).toUpperCase()] ?? DEFAULT_ASSET_PRECISION;

const DECIMAL_RE = /^-?\d+(?:\.\d+)?$/;

/**
 * Parses a non-negative decimal string to a BigInt scaled by `INTERNAL_SCALE`.
 *
 * @param {string | number} value
 * @returns {bigint}
 */
const parseDecimalToInternal = (value) => {
    const raw = typeof value === "number" ? value.toString() : String(value ?? "").trim();
    if (!DECIMAL_RE.test(raw) || raw.startsWith("-")) {
        throw new Error(`Invalid non-negative decimal: ${JSON.stringify(value)}`);
    }
    const [intPart, fracPart = ""] = raw.split(".");
    const padded = (fracPart + "0".repeat(INTERNAL_SCALE)).slice(0, INTERNAL_SCALE);
    return BigInt(intPart) * INTERNAL_DIVISOR + BigInt(padded || "0");
};

/**
 * Rounds an internal BigInt (scale 10^18) to `displayDecimals` using half-up, returning a
 * canonical decimal string.
 *
 * @param {bigint} internal
 * @param {number} displayDecimals
 * @returns {string}
 */
const formatInternalAsDecimal = (internal, displayDecimals) => {
    if (internal < 0n) {
        throw new Error("Negative pricing value cannot be formatted.");
    }
    const diff = INTERNAL_SCALE - displayDecimals;
    let rounded;
    if (diff > 0) {
        const divisor = 10n ** BigInt(diff);
        const halfDivisor = divisor / 2n;
        rounded = (internal + halfDivisor) / divisor;
    } else if (diff < 0) {
        rounded = internal * 10n ** BigInt(-diff);
    } else {
        rounded = internal;
    }
    const str = rounded.toString();
    if (displayDecimals === 0) return str;
    const padded = str.padStart(displayDecimals + 1, "0");
    const intStr = padded.slice(0, padded.length - displayDecimals);
    const fracStr = padded.slice(padded.length - displayDecimals);
    return `${intStr}.${fracStr}`;
};

/** Rounds an internal amount down to an integer number of minor units for dust checks. */
const internalToMinorUnits = (internal, decimals) => {
    const diff = INTERNAL_SCALE - decimals;
    if (diff <= 0) return internal;
    const divisor = 10n ** BigInt(diff);
    return internal / divisor;
};

const multiplyInternal = (a, b) => (a * b) / INTERNAL_DIVISOR;

/**
 * @typedef {{
 *   type: 'fixed' | 'percentage' | 'hybrid',
 *   fixedFiat?: string,
 *   percentageBps?: number,
 *   minFiat?: string,
 *   maxFiat?: string,
 *   label?: string,
 * }} CommissionConfig
 */

/** Safe system default: $0.50 + 1.50% with a $1.00 floor. */
export const DEFAULT_COMMISSION_CONFIG = Object.freeze({
    type: COMMISSION_MODEL_TYPE.HYBRID,
    fixedFiat: "0.50",
    percentageBps: 150,
    minFiat: "1.00",
    label: "default_hybrid_v1",
});

/**
 * Validates a commission config. Returns an array of human-readable error messages; an empty
 * array means valid.
 *
 * @param {CommissionConfig | null | undefined} config
 * @returns {string[]}
 */
export const validateCommissionConfig = (config) => {
    const errors = [];
    if (!config || typeof config !== "object") {
        errors.push("commissionConfig must be an object.");
        return errors;
    }
    const validTypes = Object.values(COMMISSION_MODEL_TYPE);
    if (!validTypes.includes(config.type)) {
        errors.push(`commissionConfig.type must be one of ${validTypes.join(", ")}.`);
    }

    const needsFixed =
        config.type === COMMISSION_MODEL_TYPE.FIXED || config.type === COMMISSION_MODEL_TYPE.HYBRID;
    const needsPct =
        config.type === COMMISSION_MODEL_TYPE.PERCENTAGE || config.type === COMMISSION_MODEL_TYPE.HYBRID;

    if (needsFixed) {
        if (typeof config.fixedFiat !== "string" || !DECIMAL_RE.test(config.fixedFiat) || config.fixedFiat.startsWith("-")) {
            errors.push("commissionConfig.fixedFiat must be a non-negative decimal string.");
        }
    }
    if (needsPct) {
        if (
            typeof config.percentageBps !== "number" ||
            !Number.isFinite(config.percentageBps) ||
            !Number.isInteger(config.percentageBps) ||
            config.percentageBps < 0 ||
            config.percentageBps > 10000
        ) {
            errors.push("commissionConfig.percentageBps must be an integer between 0 and 10000.");
        }
    }
    for (const field of ["minFiat", "maxFiat"]) {
        const v = config[field];
        if (v !== undefined && v !== null) {
            if (typeof v !== "string" || !DECIMAL_RE.test(v) || v.startsWith("-")) {
                errors.push(`commissionConfig.${field} must be a non-negative decimal string when set.`);
            }
        }
    }
    if (
        errors.length === 0 &&
        typeof config.minFiat === "string" &&
        typeof config.maxFiat === "string"
    ) {
        const min = parseDecimalToInternal(config.minFiat);
        const max = parseDecimalToInternal(config.maxFiat);
        if (min > max) {
            errors.push("commissionConfig.minFiat must be <= maxFiat.");
        }
    }
    return errors;
};

const computeFeeInternal = (config, grossInternal) => {
    let fee = 0n;
    if (config.type === COMMISSION_MODEL_TYPE.FIXED || config.type === COMMISSION_MODEL_TYPE.HYBRID) {
        fee += parseDecimalToInternal(config.fixedFiat);
    }
    if (
        config.type === COMMISSION_MODEL_TYPE.PERCENTAGE ||
        config.type === COMMISSION_MODEL_TYPE.HYBRID
    ) {
        fee += (grossInternal * BigInt(config.percentageBps)) / 10000n;
    }
    if (typeof config.minFiat === "string") {
        const min = parseDecimalToInternal(config.minFiat);
        if (fee < min) fee = min;
    }
    if (typeof config.maxFiat === "string") {
        const max = parseDecimalToInternal(config.maxFiat);
        if (fee > max) fee = max;
    }
    if (fee > grossInternal) fee = grossInternal;
    return fee;
};

/**
 * @typedef {{
 *   grossFiatAmount: string,
 *   feeFiatAmount: string,
 *   netFiatAmount: string,
 *   fiatCurrency: string,
 *   exchangeRateApplied: string,
 *   netCryptoAmount: string,
 *   netCryptoAssetCode: string,
 *   commissionConfigSnapshot: CommissionConfig,
 *   pricingComputedAt: string,
 *   warnings: string[],
 * }} FiatToCryptoQuote
 */

/**
 * Computes the authoritative quote for a fiat-to-crypto order: gross, fee, net fiat, and the net
 * crypto amount delivered after applying `exchangeRate` (crypto per 1 unit of fiat).
 *
 * @param {{
 *   fiatAmount: string,
 *   fiatCurrency: string,
 *   targetAssetCode: string,
 *   exchangeRate: string,
 *   commissionConfig?: CommissionConfig,
 *   computedAt?: string,
 * }} input
 * @returns {FiatToCryptoQuote}
 */
export const computeFiatToCryptoQuote = (input) => {
    const { fiatAmount, fiatCurrency, targetAssetCode, exchangeRate } = input ?? {};
    const config = input?.commissionConfig ?? DEFAULT_COMMISSION_CONFIG;

    const configErrors = validateCommissionConfig(config);
    if (configErrors.length > 0) {
        throw new Error(`Invalid commissionConfig: ${configErrors.join("; ")}`);
    }
    if (typeof fiatCurrency !== "string" || fiatCurrency.trim() === "") {
        throw new Error("fiatCurrency is required.");
    }
    if (typeof targetAssetCode !== "string" || targetAssetCode.trim() === "") {
        throw new Error("targetAssetCode is required.");
    }
    if (typeof fiatAmount !== "string" || !DECIMAL_RE.test(fiatAmount) || fiatAmount.startsWith("-")) {
        throw new Error("fiatAmount must be a non-negative decimal string.");
    }
    if (typeof exchangeRate !== "string" || !DECIMAL_RE.test(exchangeRate) || exchangeRate.startsWith("-")) {
        throw new Error("exchangeRate must be a non-negative decimal string.");
    }

    const grossInternal = parseDecimalToInternal(fiatAmount);
    if (grossInternal === 0n) {
        throw new Error("fiatAmount must be greater than zero.");
    }
    const rateInternal = parseDecimalToInternal(exchangeRate);
    if (rateInternal === 0n) {
        throw new Error("exchangeRate must be greater than zero.");
    }

    const feeInternal = computeFeeInternal(config, grossInternal);
    const netFiatInternal = grossInternal - feeInternal;
    const netCryptoInternal = multiplyInternal(netFiatInternal, rateInternal);

    const assetPrec = getAssetPrecision(targetAssetCode);
    const netCryptoMinor = internalToMinorUnits(netCryptoInternal, assetPrec.decimals);

    const warnings = [];
    if (netFiatInternal === 0n) {
        warnings.push("net_fiat_is_zero");
    }
    if (netCryptoMinor < assetPrec.dustMinor) {
        warnings.push("net_crypto_below_dust_threshold");
    }

    return {
        grossFiatAmount: formatInternalAsDecimal(grossInternal, FIAT_DECIMALS),
        feeFiatAmount: formatInternalAsDecimal(feeInternal, FIAT_DECIMALS),
        netFiatAmount: formatInternalAsDecimal(netFiatInternal, FIAT_DECIMALS),
        fiatCurrency: fiatCurrency.toUpperCase(),
        exchangeRateApplied: exchangeRate,
        netCryptoAmount: formatInternalAsDecimal(netCryptoInternal, assetPrec.decimals),
        netCryptoAssetCode: targetAssetCode.toUpperCase(),
        commissionConfigSnapshot: { ...config },
        pricingComputedAt: input?.computedAt ?? new Date().toISOString(),
        warnings,
    };
};

/**
 * Builds the partial order patch that persists the pricing snapshot onto a FiatToCryptoOrder.
 * Included on create (intake) and refreshed on admin approve.
 *
 * @param {FiatToCryptoQuote} quote
 * @returns {{
 *   grossFiatAmount: string,
 *   feeFiatAmount: string,
 *   netFiatAmount: string,
 *   exchangeRateApplied: string,
 *   netCryptoAmount: string,
 *   netCryptoAssetCode: string,
 *   commissionConfigSnapshot: CommissionConfig,
 *   pricingComputedAt: string,
 *   pricingWarnings?: ReadonlyArray<string>,
 * }}
 */
export const buildOrderPricingPatch = (quote) => ({
    grossFiatAmount: quote.grossFiatAmount,
    feeFiatAmount: quote.feeFiatAmount,
    netFiatAmount: quote.netFiatAmount,
    exchangeRateApplied: quote.exchangeRateApplied,
    netCryptoAmount: quote.netCryptoAmount,
    netCryptoAssetCode: quote.netCryptoAssetCode,
    commissionConfigSnapshot: { ...quote.commissionConfigSnapshot },
    pricingComputedAt: quote.pricingComputedAt,
    ...(quote.warnings.length > 0 ? { pricingWarnings: quote.warnings } : {}),
});
