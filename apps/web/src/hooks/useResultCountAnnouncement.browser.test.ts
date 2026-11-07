import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useResultCountAnnouncement } from "./useResultCountAnnouncement";

const NOUNS: [string, string] = ["paper", "papers"];

describe("useResultCountAnnouncement", () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it("stays quiet on first render and announces once filtering settles", () => {
		const { result, rerender } = renderHook(
			({ count, filter }) => useResultCountAnnouncement(count, NOUNS, filter),
			{ initialProps: { count: 5, filter: "" } },
		);
		act(() => vi.advanceTimersByTime(1000));
		expect(result.current).toBe("");

		rerender({ count: 1, filter: "rea" });
		act(() => vi.advanceTimersByTime(300));
		rerender({ count: 0, filter: "reaz" });
		act(() => vi.advanceTimersByTime(300));
		// Still typing: nothing yet.
		expect(result.current).toBe("");
		act(() => vi.advanceTimersByTime(700));
		expect(result.current).toBe("No papers match.");

		rerender({ count: 1, filter: "rea" });
		act(() => vi.advanceTimersByTime(700));
		expect(result.current).toBe("1 paper");
	});
});
