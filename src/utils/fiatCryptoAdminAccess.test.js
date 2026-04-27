import {
    canAccessFiatCryptoAdminUi,
    isEmailInFiatCryptoAdminAllowlist,
} from "./fiatCryptoAdminAccess";

const orig = process.env.NEXT_PUBLIC_FIAT_CRYPTO_ADMIN_EMAILS;

describe("fiatCryptoAdminAccess", () => {
    afterEach(() => {
        if (orig === undefined) {
            delete process.env.NEXT_PUBLIC_FIAT_CRYPTO_ADMIN_EMAILS;
        } else {
            process.env.NEXT_PUBLIC_FIAT_CRYPTO_ADMIN_EMAILS = orig;
        }
    });

    it("canAccess is false when not authenticated", () => {
        delete process.env.NEXT_PUBLIC_FIAT_CRYPTO_ADMIN_EMAILS;
        expect(canAccessFiatCryptoAdminUi({ email: "a@b.com" }, false)).toBe(false);
    });

    it("when allowlist empty, any signed-in user can access", () => {
        delete process.env.NEXT_PUBLIC_FIAT_CRYPTO_ADMIN_EMAILS;
        expect(canAccessFiatCryptoAdminUi({ uid: "1", email: "a@b.com" }, true)).toBe(true);
    });

    it("when allowlist set, email must match", () => {
        process.env.NEXT_PUBLIC_FIAT_CRYPTO_ADMIN_EMAILS = "ops@example.com";
        expect(isEmailInFiatCryptoAdminAllowlist("ops@example.com")).toBe(true);
        expect(isEmailInFiatCryptoAdminAllowlist("other@example.com")).toBe(false);
        expect(canAccessFiatCryptoAdminUi({ uid: "1", email: "ops@example.com" }, true)).toBe(true);
        expect(canAccessFiatCryptoAdminUi({ uid: "1", email: "other@example.com" }, true)).toBe(false);
    });
});
