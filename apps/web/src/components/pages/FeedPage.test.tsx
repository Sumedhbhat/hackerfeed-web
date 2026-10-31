import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import React, { Suspense } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", async () => ({
	createLink: (await import("#/test/createLinkMock")).createLinkMock,
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

vi.mock("#/lib/open-link", () => ({ openLink: vi.fn() }));

vi.mock("#/hooks/useAuthSession", () => ({
	useAuthSession: () => ({
		isLoading: false,
		user: null,
	}),
}));

vi.mock("#/hooks/useFeatureFlags", () => ({ useFeatureFlag: () => false }));

import { FeedPage } from "#/components/pages/FeedPage";

function readyIdsQuery(ids: number[]) {
	return {
		data: ids,
		refetch: vi.fn(),
	};
}

const emptyIdsQuery = {
	data: [] as number[],
	refetch: vi.fn(),
};

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

function Wrapper({ children }: { children: React.ReactNode }) {
	return (
		<Suspense fallback={<div data-testid="suspense-fallback" />}>
			{children}
		</Suspense>
	);
}

beforeEach(() => {
	vi.clearAllMocks();
	localStorage.clear();
});

afterEach(() => {
	cleanup();
	localStorage.clear();
});

describe("feed tabs", () => {
	beforeEach(() => {
		const ids = [1, 2];
		mockUseSuspenseQuery.mockReturnValue(readyIdsQuery(ids));
		mockUseSuspenseQueries.mockReturnValue(ids.map(storyResult));
	});

	it("renders all three feed tabs", () => {
		render(<FeedPage />, { wrapper: Wrapper });

		expect(screen.getByRole("tab", { name: /top/i })).toBeDefined();
		expect(screen.getByRole("tab", { name: /new/i })).toBeDefined();
		expect(screen.getByRole("tab", { name: /best/i })).toBeDefined();
	});

	it("'Top' tab is active (aria-selected=true) by default", () => {
		render(<FeedPage />, { wrapper: Wrapper });

		const topBtn = screen.getByRole("tab", { name: /^top$/i });
		expect(topBtn.getAttribute("aria-selected")).toBe("true");
	});

	it("'New' and 'Best' tabs are inactive (aria-selected=false) by default", () => {
		render(<FeedPage />, { wrapper: Wrapper });

		const newBtn = screen.getByRole("tab", { name: /^new$/i });
		const bestBtn = screen.getByRole("tab", { name: /^best$/i });
		expect(newBtn.getAttribute("aria-selected")).toBe("false");
		expect(bestBtn.getAttribute("aria-selected")).toBe("false");
	});
});

describe("tab switching", () => {
	beforeEach(() => {
		const ids = [1, 2];
		mockUseSuspenseQuery.mockReturnValue(readyIdsQuery(ids));
		mockUseSuspenseQueries.mockReturnValue(ids.map(storyResult));
	});

	it("clicking 'New' makes it the active tab", () => {
		render(<FeedPage />, { wrapper: Wrapper });

		fireEvent.click(screen.getByRole("tab", { name: /^new$/i }));

		expect(
			screen.getByRole("tab", { name: /^new$/i }).getAttribute("aria-selected"),
		).toBe("true");
	});

	it("clicking 'Best' makes it the active tab", () => {
		render(<FeedPage />, { wrapper: Wrapper });

		fireEvent.click(screen.getByRole("tab", { name: /^best$/i }));

		expect(
			screen
				.getByRole("tab", { name: /^best$/i })
				.getAttribute("aria-selected"),
		).toBe("true");
	});

	const requestedFeeds = () =>
		new Set(
			mockUseSuspenseQuery.mock.calls.map(([options]) => options.queryKey[2]),
		);

	it("loads a feed straight away when its tab is opened", () => {
		render(<FeedPage />, { wrapper: Wrapper });

		expect(requestedFeeds()).toEqual(new Set(["top"]));

		fireEvent.click(screen.getByRole("tab", { name: /^new$/i }));

		expect(requestedFeeds()).toEqual(new Set(["top", "new"]));
	});

	it("loads the other feeds once the page is idle", async () => {
		render(<FeedPage />, { wrapper: Wrapper });

		await waitFor(() =>
			expect(requestedFeeds()).toEqual(new Set(["top", "new", "best"])),
		);
	});

	it("switching tab deactivates the previously active tab", () => {
		render(<FeedPage />, { wrapper: Wrapper });

		fireEvent.click(screen.getByRole("tab", { name: /^new$/i }));

		expect(
			screen.getByRole("tab", { name: /^top$/i }).getAttribute("aria-selected"),
		).toBe("false");
	});

	it("switching to 'New' deactivates other tabs", () => {
		render(<FeedPage />, { wrapper: Wrapper });

		fireEvent.click(screen.getByRole("tab", { name: /^new$/i }));

		expect(
			screen.getByRole("tab", { name: /^top$/i }).getAttribute("aria-selected"),
		).toBe("false");
		expect(
			screen
				.getByRole("tab", { name: /^best$/i })
				.getAttribute("aria-selected"),
		).toBe("false");
	});

	it("switching to 'Best' deactivates other tabs", () => {
		render(<FeedPage />, { wrapper: Wrapper });

		fireEvent.click(screen.getByRole("tab", { name: /^best$/i }));

		expect(
			screen.getByRole("tab", { name: /^top$/i }).getAttribute("aria-selected"),
		).toBe("false");
		expect(
			screen.getByRole("tab", { name: /^new$/i }).getAttribute("aria-selected"),
		).toBe("false");
	});

	it("switching back to 'Top' reactivates it", () => {
		render(<FeedPage />, { wrapper: Wrapper });

		fireEvent.click(screen.getByRole("tab", { name: /^new$/i }));
		fireEvent.click(screen.getByRole("tab", { name: /^top$/i }));

		expect(
			screen.getByRole("tab", { name: /^top$/i }).getAttribute("aria-selected"),
		).toBe("true");
	});
});

describe("empty state", () => {
	it("renders the empty state panel when the feed returns no IDs", () => {
		mockUseSuspenseQuery.mockReturnValue(emptyIdsQuery);
		mockUseSuspenseQueries.mockReturnValue([]);

		render(<FeedPage />, { wrapper: Wrapper });

		// Activity renders all three panes in the DOM (hidden ones get display:none),
		// so use getAllBy* and assert at least one match.
		expect(screen.getAllByText(/nothing here yet/i).length).toBeGreaterThan(0);
		expect(
			screen.getAllByRole("button", { name: /refresh feed/i }).length,
		).toBeGreaterThan(0);
	});
});

describe("error state", () => {
	it("renders the reporting boundary fallback when a feed query throws", () => {
		const consoleError = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);
		mockUseSuspenseQuery.mockImplementation(() => {
			throw new Error("feed unavailable");
		});

		render(<FeedPage />, { wrapper: Wrapper });

		expect(screen.getByText("Feed unavailable")).toBeDefined();
		expect(screen.getByRole("button", { name: /retry/i })).toBeDefined();
		consoleError.mockRestore();
	});
});

describe("ready state", () => {
	it("renders story titles when feed and items resolve successfully", () => {
		const ids = [101, 102];
		mockUseSuspenseQuery.mockReturnValue(readyIdsQuery(ids));
		mockUseSuspenseQueries.mockReturnValue(ids.map(storyResult));

		render(<FeedPage />, { wrapper: Wrapper });

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

		render(<FeedPage />, { wrapper: Wrapper });

		expect(
			screen.getAllByRole("button", { name: /load \d+ more/i }).length,
		).toBeGreaterThan(0);
	});

	it("does not show 'Load more' when all stories fit on the first page", () => {
		const ids = [301, 302, 303];
		mockUseSuspenseQuery.mockReturnValue(readyIdsQuery(ids));
		mockUseSuspenseQueries.mockReturnValue(ids.map(storyResult));

		render(<FeedPage />, { wrapper: Wrapper });

		expect(
			screen.queryAllByRole("button", { name: /load \d+ more/i }),
		).toHaveLength(0);
	});
});
