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

/**
 * @param {string} status
 * @returns {Array<import("../domain/fiatToCryptoOrder.js").FiatToCryptoOrder>}
 */
export const listFiatToCryptoOrdersByStatus = (status) => {
    const out = [];
    for (const order of ordersById.values()) {
        if (order.status === status) out.push(order);
    }
    out.sort((a, b) => String(a.updatedAt ?? a.createdAt).localeCompare(String(b.updatedAt ?? b.createdAt)));
    return out;
};

/**
 * Merges a patch onto the stored order. Returns the updated order or undefined when not found.
 *
 * @param {string} id
 * @param {Partial<import("../domain/fiatToCryptoOrder.js").FiatToCryptoOrder>} patch
 * @returns {import("../domain/fiatToCryptoOrder.js").FiatToCryptoOrder | undefined}
 */
export const updateFiatToCryptoOrder = (id, patch) => {
    const existing = ordersById.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch };
    ordersById.set(id, updated);
    return updated;
};

/** For tests only */
export const __clearInMemoryFiatToCryptoOrdersForTests = () => {
    ordersById.clear();
};
