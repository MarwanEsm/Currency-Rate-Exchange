/**
 * Demo persistence for FCX-25 (in-memory). Replace with a database in production.
 */

/** @type {Map<string, import("../domain/fiatToCryptoOrder.js").FiatToCryptoOrder>} */
const ordersById = new Map();

/**
 * @param {import("../domain/fiatToCryptoOrder.js").FiatToCryptoOrder} order
 */
export const saveSubmittedFiatToCryptoOrder = (order) => {
    ordersById.set(order.id, order);
    return order;
};

/**
 * @param {string} id
 * @returns {import("../domain/fiatToCryptoOrder.js").FiatToCryptoOrder | undefined}
 */
export const getFiatToCryptoOrderById = (id) => ordersById.get(id);

/** For tests only */
export const __clearInMemoryFiatToCryptoOrdersForTests = () => {
    ordersById.clear();
};
