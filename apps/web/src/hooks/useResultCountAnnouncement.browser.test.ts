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
		expect(result.current).toBe("");
		act(() => vi.advanceTimersByTime(700));
		expect(result.current).toBe("No papers match.");

		rerender({ count: 1, filter: "rea" });
		act(() => vi.advanceTimersByTime(700));
		expect(result.current).toBe("1 paper");
	});

	it("stays quiet when only the count changes (an unsave, Undo or Clear)", () => {
		const { result, rerender } = renderHook(
			({ count, filter }) => useResultCountAnnouncement(count, NOUNS, filter),
			{ initialProps: { count: 3, filter: "" } },
		);
		rerender({ count: 3, filter: "q" });
		act(() => vi.advanceTimersByTime(700));
		rerender({ count: 3, filter: "" });
		act(() => vi.advanceTimersByTime(700));
		expect(result.current).toBe("3 papers");

		rerender({ count: 2, filter: "" });
		act(() => vi.advanceTimersByTime(1000));
		rerender({ count: 0, filter: "" });
		act(() => vi.advanceTimersByTime(1000));
		expect(result.current).toBe("3 papers");
	});
});
