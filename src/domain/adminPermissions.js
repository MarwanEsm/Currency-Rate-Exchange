/**
 * Admin role / permission model (FCX-26).
 *
 * Production note: `adminUserId` and `roles` must come from a trusted session (e.g. validated
 * Firebase ID token + server-side role lookup), not client-supplied fields. The pure helpers
 * here describe **policy** independent of transport.
 */

export const ADMIN_ROLE = {
    ORDER_REVIEWER: "order_reviewer",
    OPERATIONS_MANAGER: "operations_manager",
    COMPLIANCE_OFFICER: "compliance_officer",
    READ_ONLY_AUDITOR: "read_only_auditor",
};

export const ADMIN_PERMISSION = {
    VIEW_ORDER_QUEUE: "view_order_queue",
    DECIDE_ORDER_APPROVAL: "decide_order_approval",
};

/**
 * Static mapping of role → allowed permissions. Single source of truth for gating actions.
 *
 * @type {Readonly<Record<string, ReadonlyArray<string>>>}
 */
export const ROLE_PERMISSIONS = Object.freeze({
    [ADMIN_ROLE.ORDER_REVIEWER]: [ADMIN_PERMISSION.VIEW_ORDER_QUEUE, ADMIN_PERMISSION.DECIDE_ORDER_APPROVAL],
    [ADMIN_ROLE.OPERATIONS_MANAGER]: [
        ADMIN_PERMISSION.VIEW_ORDER_QUEUE,
        ADMIN_PERMISSION.DECIDE_ORDER_APPROVAL,
    ],
    [ADMIN_ROLE.COMPLIANCE_OFFICER]: [ADMIN_PERMISSION.VIEW_ORDER_QUEUE, ADMIN_PERMISSION.DECIDE_ORDER_APPROVAL],
    [ADMIN_ROLE.READ_ONLY_AUDITOR]: [ADMIN_PERMISSION.VIEW_ORDER_QUEUE],
});

/**
 * @param {ReadonlyArray<string> | null | undefined} roles
 * @param {string} permission
 * @returns {boolean}
 */
export const hasAdminPermission = (roles, permission) => {
    if (!Array.isArray(roles) || roles.length === 0) return false;
    for (const role of roles) {
        const allowed = ROLE_PERMISSIONS[role];
        if (allowed && allowed.includes(permission)) return true;
    }
    return false;
};

/**
 * Normalizes a raw list of role strings to canonical ones defined in `ADMIN_ROLE`.
 *
 * @param {unknown} raw
 * @returns {string[]}
 */
export const normalizeAdminRoles = (raw) => {
    if (!Array.isArray(raw)) return [];
    const known = new Set(Object.values(ADMIN_ROLE));
    const out = [];
    for (const r of raw) {
        if (typeof r === "string" && known.has(r) && !out.includes(r)) out.push(r);
    }
    return out;
};
