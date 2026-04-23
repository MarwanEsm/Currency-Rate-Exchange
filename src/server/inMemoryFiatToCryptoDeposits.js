/**
 * Demo persistence for deposit records reconciled by FCX-23. Replace with a durable store in
 * production (the real store must be idempotent on `depositId` and indexed by `reference`).
 */

/** @type {Map<string, import("../domain/fiatToCryptoDeposit.js").DepositRecord>} */
const depositsById = new Map();

/**
 * Record a deposit once it has been reconciled (regardless of outcome). Callers should still keep
 * the deposit record even when the outcome is `no_matching_order` so retries don't double-process.
 *
 * @param {import("../domain/fiatToCryptoDeposit.js").DepositRecord} deposit
 */
export const saveReconciledDeposit = (deposit) => {
    depositsById.set(deposit.id, deposit);
    return deposit;
};

/**
 * @param {string} id
 * @returns {import("../domain/fiatToCryptoDeposit.js").DepositRecord | undefined}
 */
export const getReconciledDepositById = (id) => depositsById.get(id);

/**
 * @returns {Array<import("../domain/fiatToCryptoDeposit.js").DepositRecord>}
 */
export const listReconciledDeposits = () => [...depositsById.values()];

/**
 * @returns {string[]}
 */
export const listReconciledDepositIds = () => [...depositsById.keys()];

/** For tests only. */
export const __clearInMemoryFiatToCryptoDepositsForTests = () => {
    depositsById.clear();
};
