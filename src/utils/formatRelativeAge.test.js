import { formatRelativeAge } from "./formatRelativeAge";

describe("formatRelativeAge (FCX-31)", () => {
    test.each([
        [null, null],
        [undefined, null],
        [Number.NaN, null],
        [Number.POSITIVE_INFINITY, null],
        [-1_000, null],
        [0, "just now"],
        [4_999, "just now"],
        [5_000, "5s ago"],
        [59_000, "59s ago"],
        [60_000, "1m ago"],
        [59 * 60 * 1000, "59m ago"],
        [60 * 60 * 1000, "1h ago"],
        [23 * 60 * 60 * 1000, "23h ago"],
        [24 * 60 * 60 * 1000, "1d ago"],
        [3 * 24 * 60 * 60 * 1000, "3d ago"],
    ])("formats age %p as %p", (input, expected) => {
        expect(formatRelativeAge(input)).toBe(expected);
    });
});
