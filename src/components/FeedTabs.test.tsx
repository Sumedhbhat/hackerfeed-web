/**
 * Feed tab switching tests.
 *
 * Environment: jsdom (auto-applied via vitest.config.ts environmentMatchGlobs).
 *
 * These tests exercise the feed-tab UI in isolation by mocking TanStack Query
 * hooks and TanStack Router primitives so the component can be rendered
 * outside of a full router context.
 *
 * Covers:
 *  - All three feed tabs (top / new / best) render their tab buttons
 *  - The default active tab is "top" with aria-pressed="true"
 *  - Clicking another tab changes the active tab
 *  - Feed header text updates to reflect the active tab
 *  - Loading state renders skeleton cards while the ID query is pending
 *  - Error state renders the recovery panel
 *  - Empty state renders the empty-surface panel
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Module mocks — must be declared before any imports that pull in the mocked
// modules so vitest can hoist them correctly.
// ---------------------------------------------------------------------------

// Mock TanStack Router so createFileRoute and Link don't need a real router.
vi.mock("@tanstack/react-router", () => ({
	// createFileRoute(path) returns a function that accepts route options and
	// just passes the component through unchanged.
	createFileRoute: (_path: string) => (options: { component: unknown }) =>
		options,
	Link: ({
		to,
		children,
		...rest
	}: {
		to: string;
		children: React.ReactNode;
		[key: string]: unknown;
	}) => React.createElement("a", { href: to, ...rest }, children),
}));

// Mock useQuery and useQueries to avoid real network calls.
// We control return values per-test via the exported mock functions.
const mockUseQuery = vi.fn();
const mockUseQueries = vi.fn();

vi.mock("@tanstack/react-query", async (importOriginal) => {
	const original =
		await importOriginal<typeof import("@tanstack/react-query")>();
	return {
		...original,
		useQuery: (...args: unknown[]) => mockUseQuery(...args),
		useQueries: (...args: unknown[]) => mockUseQueries(...args),
	};
});

// Mock openLink to prevent window.open calls.
vi.mock("#/lib/open-link", () => ({ openLink: vi.fn() }));

// ---------------------------------------------------------------------------
// Import the component under test AFTER mocks are registered.
// ---------------------------------------------------------------------------

import { App as FeedApp } from "#/routes/index";

const loadingQuery = {
	data: undefined,
	isPending: true,
	isError: false,
	isFetching: false,
	refetch: vi.fn(),
};

/** A resolved query with a list of IDs. */
function readyIdsQuery(ids: number[]) {
	return {
		data: ids,
		isPending: false,
		isError: false,
		isFetching: false,
		refetch: vi.fn(),
	};
}

/** A failed query. */
const errorQuery = {
	data: undefined,
	isPending: false,
	isError: true,
	isFetching: false,
	refetch: vi.fn(),
};

/** An empty resolved query (no IDs). */
const emptyQuery = {
	data: [] as number[],
	isPending: false,
	isError: false,
	isFetching: false,
	refetch: vi.fn(),
};

/** A minimal resolved story item query result. */
function storyResult(id: number) {
	return {
		data: {
			by: "user",
			descendants: 5,
			id,
			score: 100,
			text: null,
			time: 1_700_000_000,
			title: `Story ${id}`,
			type: "story" as const,
			url: `https://example.com/${id}`,
		},
		isPending: false,
		isError: false,
	};
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	vi.clearAllMocks();
	localStorage.clear();
});

afterEach(() => {
	cleanup();
	localStorage.clear();
});

// ---------------------------------------------------------------------------
// Tab rendering
// ---------------------------------------------------------------------------

describe("feed tab buttons", () => {
	beforeEach(() => {
		// Default: top feed loading so we don't render story cards.
		mockUseQuery.mockReturnValue(loadingQuery);
		mockUseQueries.mockReturnValue([]);
	});

	it("renders all three feed tab buttons", () => {
		render(<FeedApp />);

		expect(screen.getByRole("button", { name: /top/i })).toBeDefined();
		expect(screen.getByRole("button", { name: /new/i })).toBeDefined();
		expect(screen.getByRole("button", { name: /best/i })).toBeDefined();
	});

	it("'Top' tab is active (aria-pressed=true) by default", () => {
		render(<FeedApp />);

		const topBtn = screen.getByRole("button", { name: /^top$/i });
		expect(topBtn.getAttribute("aria-pressed")).toBe("true");
	});

	it("'New' and 'Best' tabs are inactive (aria-pressed=false) by default", () => {
		render(<FeedApp />);

		const newBtn = screen.getByRole("button", { name: /^new$/i });
		const bestBtn = screen.getByRole("button", { name: /^best$/i });
		expect(newBtn.getAttribute("aria-pressed")).toBe("false");
		expect(bestBtn.getAttribute("aria-pressed")).toBe("false");
	});
});

// ---------------------------------------------------------------------------
// Tab switching
// ---------------------------------------------------------------------------

describe("tab switching", () => {
	beforeEach(() => {
		mockUseQuery.mockReturnValue(loadingQuery);
		mockUseQueries.mockReturnValue([]);
	});

	it("clicking 'New' makes it the active tab", () => {
		render(<FeedApp />);

		fireEvent.click(screen.getByRole("button", { name: /^new$/i }));

		expect(
			screen
				.getByRole("button", { name: /^new$/i })
				.getAttribute("aria-pressed"),
		).toBe("true");
	});

	it("clicking 'Best' makes it the active tab", () => {
		render(<FeedApp />);

		fireEvent.click(screen.getByRole("button", { name: /^best$/i }));

		expect(
			screen
				.getByRole("button", { name: /^best$/i })
				.getAttribute("aria-pressed"),
		).toBe("true");
	});

	it("switching tab deactivates the previously active tab", () => {
		render(<FeedApp />);

		// Top is initially active; switch to New.
		fireEvent.click(screen.getByRole("button", { name: /^new$/i }));

		expect(
			screen
				.getByRole("button", { name: /^top$/i })
				.getAttribute("aria-pressed"),
		).toBe("false");
	});

	it("feed header title updates when switching to 'New' tab", () => {
		render(<FeedApp />);

		fireEvent.click(screen.getByRole("button", { name: /^new$/i }));

		// The feed meta title for "new" is "New stories"
		expect(screen.getByText("New stories")).toBeDefined();
	});

	it("feed header title updates when switching to 'Best' tab", () => {
		render(<FeedApp />);

		fireEvent.click(screen.getByRole("button", { name: /^best$/i }));

		expect(screen.getByText("Best stories")).toBeDefined();
	});

	it("feed header title reverts when switching back to 'Top'", () => {
		render(<FeedApp />);

		fireEvent.click(screen.getByRole("button", { name: /^new$/i }));
		fireEvent.click(screen.getByRole("button", { name: /^top$/i }));

		expect(screen.getByText("Top stories")).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// Feed states — loading
// ---------------------------------------------------------------------------

describe("loading state", () => {
	it("renders skeleton cards while the ID list is loading", () => {
		mockUseQuery.mockReturnValue(loadingQuery);
		mockUseQueries.mockReturnValue([]);

		render(<FeedApp />);

		// Skeleton articles should appear (12 by default = PAGE_SIZE)
		const articles = document.querySelectorAll("article");
		// At least some skeleton articles should be present
		expect(articles.length).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Feed states — error
// ---------------------------------------------------------------------------

describe("error state", () => {
	it("renders the error recovery panel when the ID query fails", () => {
		mockUseQuery.mockReturnValue(errorQuery);
		mockUseQueries.mockReturnValue([]);

		render(<FeedApp />);

		expect(screen.getByText(/feed unavailable/i)).toBeDefined();
		expect(screen.getByRole("button", { name: /retry feed/i })).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// Feed states — empty
// ---------------------------------------------------------------------------

describe("empty state", () => {
	it("renders the empty state panel when the feed returns no IDs", () => {
		mockUseQuery.mockReturnValue(emptyQuery);
		mockUseQueries.mockReturnValue([]);

		render(<FeedApp />);

		expect(screen.getByText(/nothing here yet/i)).toBeDefined();
		expect(screen.getByRole("button", { name: /refresh feed/i })).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// Feed states — ready (stories visible)
// ---------------------------------------------------------------------------

describe("ready state", () => {
	it("renders story titles when feed and items resolve successfully", () => {
		const ids = [101, 102];
		mockUseQuery.mockReturnValue(readyIdsQuery(ids));
		mockUseQueries.mockReturnValue(ids.map(storyResult));

		render(<FeedApp />);

		expect(screen.getByText("Story 101")).toBeDefined();
		expect(screen.getByText("Story 102")).toBeDefined();
	});

	it("renders rank badges for each story", () => {
		const ids = [201, 202];
		mockUseQuery.mockReturnValue(readyIdsQuery(ids));
		mockUseQueries.mockReturnValue(ids.map(storyResult));

		render(<FeedApp />);

		// Rank badges are zero-padded: "01", "02"
		expect(screen.getByText("01")).toBeDefined();
		expect(screen.getByText("02")).toBeDefined();
	});

	it("shows 'Load N more' button when there are more stories than the initial page", () => {
		// Create more IDs than PAGE_SIZE (12) so "Load more" appears.
		const ids = Array.from({ length: 20 }, (_, i) => i + 1);
		mockUseQuery.mockReturnValue(readyIdsQuery(ids));
		// Only the first 12 stories resolve; rest are still loading.
		const firstPage = ids.slice(0, 12).map(storyResult);
		mockUseQueries.mockReturnValue(firstPage);

		render(<FeedApp />);

		// The button text is "Load N more" where N ≤ PAGE_SIZE
		expect(
			screen.getByRole("button", { name: /load \d+ more/i }),
		).toBeDefined();
	});

	it("does not show 'Load more' when all stories fit on the first page", () => {
		const ids = [301, 302, 303];
		mockUseQuery.mockReturnValue(readyIdsQuery(ids));
		mockUseQueries.mockReturnValue(ids.map(storyResult));

		render(<FeedApp />);

		expect(screen.queryByRole("button", { name: /load \d+ more/i })).toBeNull();
	});
});
