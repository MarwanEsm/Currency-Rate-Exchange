/**
 * Format a millisecond age as a short, human-friendly relative string.
 * Used to surface how stale an exchange-rate snapshot is (FCX-31).
 *
 *   < 5s             → "just now"
 *   5s … <  60s      → "Ns ago"
 *   60s … < 60m      → "Nm ago"
 *   60m … < 24h      → "Nh ago"
 *   ≥ 24h            → "Nd ago"
 *
 * Returns `null` for non-finite or negative inputs so callers can opt out cleanly.
 *
 * @param {number | null | undefined} ageMs
 * @returns {string | null}
 */
export const formatRelativeAge = (ageMs) => {
    if (typeof ageMs !== "number" || !Number.isFinite(ageMs) || ageMs < 0) return null;
    if (ageMs < 5_000) return "just now";

    const seconds = Math.floor(ageMs / 1000);
    if (seconds < 60) return `${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
};

export default formatRelativeAge;
