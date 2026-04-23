import { ADMIN_PERMISSION, ADMIN_ROLE, hasAdminPermission, normalizeAdminRoles } from "./adminPermissions";

describe("adminPermissions", () => {
    describe("hasAdminPermission", () => {
        it("grants view + decide to ORDER_REVIEWER", () => {
            expect(hasAdminPermission([ADMIN_ROLE.ORDER_REVIEWER], ADMIN_PERMISSION.VIEW_ORDER_QUEUE)).toBe(true);
            expect(hasAdminPermission([ADMIN_ROLE.ORDER_REVIEWER], ADMIN_PERMISSION.DECIDE_ORDER_APPROVAL)).toBe(true);
        });

        it("grants view but not decide to READ_ONLY_AUDITOR", () => {
            expect(hasAdminPermission([ADMIN_ROLE.READ_ONLY_AUDITOR], ADMIN_PERMISSION.VIEW_ORDER_QUEUE)).toBe(true);
            expect(hasAdminPermission([ADMIN_ROLE.READ_ONLY_AUDITOR], ADMIN_PERMISSION.DECIDE_ORDER_APPROVAL)).toBe(false);
        });

        it("denies unknown / empty roles", () => {
            expect(hasAdminPermission([], ADMIN_PERMISSION.VIEW_ORDER_QUEUE)).toBe(false);
            expect(hasAdminPermission(null, ADMIN_PERMISSION.VIEW_ORDER_QUEUE)).toBe(false);
            expect(hasAdminPermission(["not_a_role"], ADMIN_PERMISSION.VIEW_ORDER_QUEUE)).toBe(false);
        });
    });

    describe("normalizeAdminRoles", () => {
        it("keeps only known roles and dedupes", () => {
            const raw = [ADMIN_ROLE.ORDER_REVIEWER, "bogus", ADMIN_ROLE.ORDER_REVIEWER, ADMIN_ROLE.READ_ONLY_AUDITOR];
            expect(normalizeAdminRoles(raw)).toEqual([ADMIN_ROLE.ORDER_REVIEWER, ADMIN_ROLE.READ_ONLY_AUDITOR]);
        });

        it("returns empty for non-array input", () => {
            expect(normalizeAdminRoles(null)).toEqual([]);
            expect(normalizeAdminRoles("order_reviewer")).toEqual([]);
        });
    });
});
