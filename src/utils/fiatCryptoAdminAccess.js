/**
 * Client-side admin visibility for fiat-crypto ops UI (must match AdminPageGuard policy).
 * Production should treat this as UX only — always enforce access on the server/API too.
 */

export const getFiatCryptoAdminEmailAllowlist = () => {
    const raw =
        typeof process.env.NEXT_PUBLIC_FIAT_CRYPTO_ADMIN_EMAILS === "string"
            ? process.env.NEXT_PUBLIC_FIAT_CRYPTO_ADMIN_EMAILS
            : "";
    return raw
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
};

/**
 * When the allowlist is empty, any signed-in user is treated as admin (demo).
 * When set, the user's email must be listed.
 *
 * @param {string | null | undefined} email
 */
export const isEmailInFiatCryptoAdminAllowlist = (email) => {
    const allowlist = getFiatCryptoAdminEmailAllowlist();
    if (allowlist.length === 0) return true;
    if (!email || typeof email !== "string") return false;
    return allowlist.includes(email.trim().toLowerCase());
};

/**
 * @param {unknown} user
 * @param {boolean} isAuthenticated
 */
export const canAccessFiatCryptoAdminUi = (user, isAuthenticated) => {
    if (!isAuthenticated || !user) return false;
    return isEmailInFiatCryptoAdminAllowlist(
        /** @type {{ email?: string | null }} */ (user).email,
    );
};
