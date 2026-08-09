/**
 * useIntersectionObserver hook tests.
 *
 * Environment: browser (happy-dom, via .browser.test.ts suffix).
 *
 * These tests verify the IntersectionObserver hook behaviour using a manual
 * mock of IntersectionObserver.
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useIntersectionObserver } from "#/hooks/useIntersectionObserver";

// ---------------------------------------------------------------------------
// IntersectionObserver mock
// ---------------------------------------------------------------------------

type MockObserverCallback = (entries: IntersectionObserverEntry[]) => void;

let observerCallback: MockObserverCallback | null = null;
const mockDisconnect = vi.fn();
const mockObserve = vi.fn();

const MockIntersectionObserver = vi.fn(
	class MockIntersectionObserver {
		observe = mockObserve;
		disconnect = mockDisconnect;
		unobserve = vi.fn();

		constructor(
			callback: MockObserverCallback,
			_options?: IntersectionObserverInit,
		) {
			observerCallback = callback;
		}
	},
);

beforeEach(() => {
	observerCallback = null;
	mockDisconnect.mockClear();
	mockObserve.mockClear();
	MockIntersectionObserver.mockClear();
	// Install mock on global
	vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Helper: fire an intersection event
// ---------------------------------------------------------------------------

function fireIntersection(isIntersecting: boolean) {
	if (!observerCallback) throw new Error("No observer callback registered");
	const cb = observerCallback;
	act(() => {
		cb([{ isIntersecting } as IntersectionObserverEntry]);
	});
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useIntersectionObserver", () => {
	it("calls the callback when the observed node becomes visible", () => {
		const callback = vi.fn();
		const { result } = renderHook(() =>
			useIntersectionObserver(callback, { rootMargin: "0px" }),
		);

		const div = document.createElement("div");
		act(() => {
			result.current(div);
		});

		fireIntersection(true);

		expect(callback).toHaveBeenCalledTimes(1);
	});

	it("does NOT call the callback when isIntersecting is false", () => {
		const callback = vi.fn();
		const { result } = renderHook(() =>
			useIntersectionObserver(callback, { rootMargin: "0px" }),
		);

		const div = document.createElement("div");
		act(() => {
			result.current(div);
		});

		fireIntersection(false);

		expect(callback).not.toHaveBeenCalled();
	});

	it("disconnects previous observer when ref callback is called with a new node", () => {
		const callback = vi.fn();
		const { result } = renderHook(() => useIntersectionObserver(callback));

		const div1 = document.createElement("div");
		const div2 = document.createElement("div");

		act(() => {
			result.current(div1);
		});

		expect(mockDisconnect).not.toHaveBeenCalled();

		act(() => {
			result.current(div2);
		});

		expect(mockDisconnect).toHaveBeenCalledTimes(1);
		expect(mockObserve).toHaveBeenCalledTimes(2);
	});

	it("disconnects and does not create a new observer when called with null", () => {
		const callback = vi.fn();
		const { result } = renderHook(() => useIntersectionObserver(callback));

		const div = document.createElement("div");
		act(() => {
			result.current(div);
		});

		act(() => {
			result.current(null);
		});

		expect(mockDisconnect).toHaveBeenCalledTimes(1);
		// Observe should only have been called once (for the real node)
		expect(mockObserve).toHaveBeenCalledTimes(1);
	});

	it("uses the latest callback without recreating the observer", () => {
		const callback1 = vi.fn();
		const callback2 = vi.fn();

		let currentCallback = callback1;
		const { result, rerender } = renderHook(() =>
			useIntersectionObserver(currentCallback),
		);

		const div = document.createElement("div");
		act(() => {
			result.current(div);
		});

		// Switch to callback2 via rerender
		currentCallback = callback2;
		rerender();

		// Observer should NOT have been recreated (stable ref pattern)
		expect(mockObserve).toHaveBeenCalledTimes(1);

		// Firing intersection now should invoke the new callback
		fireIntersection(true);

		expect(callback1).not.toHaveBeenCalled();
		expect(callback2).toHaveBeenCalledTimes(1);
	});
});
