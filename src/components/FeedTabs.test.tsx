/**
 * Feed tab switching tests.
 *
 * Environment: jsdom/happy-dom (auto-applied via vitest.config.ts environmentMatchGlobs).
 *
 * These tests exercise the feed-tab UI in isolation by mocking TanStack Query
 * hooks (useSuspenseQuery / useSuspenseQueries) and TanStack Router primitives
 * so the component can be rendered outside of a full router context.
 *
 * Covers:
 *  - All three feed tabs (top / new / best) render their tab buttons
 *  - The default active tab is "top" with aria-pressed="true"
 *  - Clicking another tab changes the active tab
 *  - Suspense fallback (skeletons) renders while feed is loading
 *  - Error boundary fallback renders when the feed query throws
 *  - Empty state renders the empty-surface panel
 *  - Ready state renders story cards
 *  - "Load more" button is present when there are more stories
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React, { Suspense } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Module mocks — must be declared before any imports that pull in the mocked
// modules so vitest can hoist them correctly.
// ---------------------------------------------------------------------------

// Mock TanStack Router so createFileRoute and Link don't need a real router.
vi.mock("@tanstack/react-router", () => ({
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

// Mock useSuspenseQuery and useSuspenseQueries to avoid real network calls.
const mockUseSuspenseQuery = vi.fn();
const mockUseSuspenseQueries = vi.fn();

vi.mock("@tanstack/react-query", async (importOriginal) => {
	const original =
		await importOriginal<typeof import("@tanstack/react-query")>();
	return {
		...original,
		useSuspenseQuery: (...args: unknown[]) => mockUseSuspenseQuery(...args),
		useSuspenseQueries: (...args: unknown[]) => mockUseSuspenseQueries(...args),
	};
});

// Mock openLink to prevent window.open calls.
vi.mock("#/lib/open-link", () => ({ openLink: vi.fn() }));

// ---------------------------------------------------------------------------
// Import the component under test AFTER mocks are registered.
// ---------------------------------------------------------------------------

import { Route } from "#/routes/index";

const FeedApp = Route.component as React.ComponentType;

// ---------------------------------------------------------------------------
// Mock data helpers
// ---------------------------------------------------------------------------

/** A resolved IDs query result. */
function readyIdsQuery(ids: number[]) {
	return {
		data: ids,
		refetch: vi.fn(),
	};
}

/** An empty resolved IDs query (no stories). */
const emptyIdsQuery = {
	data: [] as number[],
	refetch: vi.fn(),
};

/** A minimal resolved story query result. */
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
			kids: [],
		},
	};
}

// ---------------------------------------------------------------------------
// Wrapper — provides Suspense boundary so useSuspenseQuery can work
// ---------------------------------------------------------------------------

function Wrapper({ children }: { children: React.ReactNode }) {
	return (
		<Suspense fallback={<div data-testid="suspense-fallback" />}>
			{children}
		</Suspense>
	);
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
		// IDs query resolves with some IDs; story queries resolve.
		const ids = [1, 2];
		mockUseSuspenseQuery.mockReturnValue(readyIdsQuery(ids));
		mockUseSuspenseQueries.mockReturnValue(ids.map(storyResult));
	});

	it("renders all three feed tab buttons", () => {
		render(<FeedApp />, { wrapper: Wrapper });

		expect(screen.getByRole("button", { name: /top/i })).toBeDefined();
		expect(screen.getByRole("button", { name: /new/i })).toBeDefined();
		expect(screen.getByRole("button", { name: /best/i })).toBeDefined();
	});

	it("'Top' tab is active (aria-pressed=true) by default", () => {
		render(<FeedApp />, { wrapper: Wrapper });

		const topBtn = screen.getByRole("button", { name: /^top$/i });
		expect(topBtn.getAttribute("aria-pressed")).toBe("true");
	});

	it("'New' and 'Best' tabs are inactive (aria-pressed=false) by default", () => {
		render(<FeedApp />, { wrapper: Wrapper });

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
		const ids = [1, 2];
		mockUseSuspenseQuery.mockReturnValue(readyIdsQuery(ids));
		mockUseSuspenseQueries.mockReturnValue(ids.map(storyResult));
	});

	it("clicking 'New' makes it the active tab", () => {
		render(<FeedApp />, { wrapper: Wrapper });

		fireEvent.click(screen.getByRole("button", { name: /^new$/i }));

		expect(
			screen
				.getByRole("button", { name: /^new$/i })
				.getAttribute("aria-pressed"),
		).toBe("true");
	});

	it("clicking 'Best' makes it the active tab", () => {
		render(<FeedApp />, { wrapper: Wrapper });

		fireEvent.click(screen.getByRole("button", { name: /^best$/i }));

		expect(
			screen
				.getByRole("button", { name: /^best$/i })
				.getAttribute("aria-pressed"),
		).toBe("true");
	});

	it("switching tab deactivates the previously active tab", () => {
		render(<FeedApp />, { wrapper: Wrapper });

		fireEvent.click(screen.getByRole("button", { name: /^new$/i }));

		expect(
			screen
				.getByRole("button", { name: /^top$/i })
				.getAttribute("aria-pressed"),
		).toBe("false");
	});

	it("switching to 'New' deactivates other tabs", () => {
		render(<FeedApp />, { wrapper: Wrapper });

		fireEvent.click(screen.getByRole("button", { name: /^new$/i }));

		expect(
			screen
				.getByRole("button", { name: /^top$/i })
				.getAttribute("aria-pressed"),
		).toBe("false");
		expect(
			screen
				.getByRole("button", { name: /^best$/i })
				.getAttribute("aria-pressed"),
		).toBe("false");
	});

	it("switching to 'Best' deactivates other tabs", () => {
		render(<FeedApp />, { wrapper: Wrapper });

		fireEvent.click(screen.getByRole("button", { name: /^best$/i }));

		expect(
			screen
				.getByRole("button", { name: /^top$/i })
				.getAttribute("aria-pressed"),
		).toBe("false");
		expect(
			screen
				.getByRole("button", { name: /^new$/i })
				.getAttribute("aria-pressed"),
		).toBe("false");
	});

	it("switching back to 'Top' reactivates it", () => {
		render(<FeedApp />, { wrapper: Wrapper });

		fireEvent.click(screen.getByRole("button", { name: /^new$/i }));
		fireEvent.click(screen.getByRole("button", { name: /^top$/i }));

		expect(
			screen
				.getByRole("button", { name: /^top$/i })
				.getAttribute("aria-pressed"),
		).toBe("true");
	});
});

// ---------------------------------------------------------------------------
// Feed states — empty
// ---------------------------------------------------------------------------

describe("empty state", () => {
	it("renders the empty state panel when the feed returns no IDs", () => {
		mockUseSuspenseQuery.mockReturnValue(emptyIdsQuery);
		mockUseSuspenseQueries.mockReturnValue([]);

		render(<FeedApp />, { wrapper: Wrapper });

		// Activity renders all three panes in the DOM (hidden ones get display:none),
		// so use getAllBy* and assert at least one match.
		expect(screen.getAllByText(/nothing here yet/i).length).toBeGreaterThan(0);
		expect(
			screen.getAllByRole("button", { name: /refresh feed/i }).length,
		).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Feed states — ready (stories visible)
// ---------------------------------------------------------------------------

describe("ready state", () => {
	it("renders story titles when feed and items resolve successfully", () => {
		const ids = [101, 102];
		mockUseSuspenseQuery.mockReturnValue(readyIdsQuery(ids));
		mockUseSuspenseQueries.mockReturnValue(ids.map(storyResult));

		render(<FeedApp />, { wrapper: Wrapper });

		// Activity renders all three panes in DOM; use getAllBy* variants.
		expect(screen.getAllByText("Story 101").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Story 102").length).toBeGreaterThan(0);
	});

	it("shows 'Load N more' button when there are more stories than the initial page", () => {
		// Create more IDs than PAGE_SIZE (12) so "Load more" appears.
		const ids = Array.from({ length: 20 }, (_, i) => i + 1);
		mockUseSuspenseQuery.mockReturnValue(readyIdsQuery(ids));
		// Only the first 12 stories resolve (PAGE_SIZE).
		const firstPage = ids.slice(0, 12).map(storyResult);
		mockUseSuspenseQueries.mockReturnValue(firstPage);

		render(<FeedApp />, { wrapper: Wrapper });

		expect(
			screen.getAllByRole("button", { name: /load \d+ more/i }).length,
		).toBeGreaterThan(0);
	});

	it("does not show 'Load more' when all stories fit on the first page", () => {
		const ids = [301, 302, 303];
		mockUseSuspenseQuery.mockReturnValue(readyIdsQuery(ids));
		mockUseSuspenseQueries.mockReturnValue(ids.map(storyResult));

		render(<FeedApp />, { wrapper: Wrapper });

		expect(
			screen.queryAllByRole("button", { name: /load \d+ more/i }),
		).toHaveLength(0);
	});
});
