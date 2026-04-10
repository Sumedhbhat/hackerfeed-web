/**
 * StoryCard component tests.
 *
 * Environment: jsdom (auto-applied via vitest.config.ts environmentMatchGlobs).
 *
 * Covers:
 *  - Basic rendering of story metadata (title, domain, author, score, comments)
 *  - Rank badge display and absence
 *  - Primary "Read article" / "Open post" action calls openLink
 *  - "Open discussion" action calls openLink with the HN discussion URL
 *  - Favorite toggle updates aria-pressed and aria-label
 *  - Favorite toggle integrates with favoritesStore
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StoryCard, StoryCardSkeleton } from "#/components/StoryCard";
import { clearAllFavorites, isFavorited } from "#/lib/favorites-store";
import type { HackerNewsStoryRecord } from "#/lib/hacker-news/queries";

// ---------------------------------------------------------------------------
// Mock openLink so tests don't actually open browser windows
// ---------------------------------------------------------------------------

vi.mock("#/lib/open-link", () => ({
	openLink: vi.fn(),
}));

// We import the mock AFTER vi.mock so vitest hoists it correctly.
import { openLink } from "#/lib/open-link";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStory(
	overrides: Partial<HackerNewsStoryRecord> = {},
): HackerNewsStoryRecord {
	return {
		by: "author42",
		descendants: 17,
		id: 12345,
		score: 210,
		text: null,
		time: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
		title: "A Test Story Title",
		type: "story",
		url: "https://example.com/test-article",
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	localStorage.clear();
	clearAllFavorites();
	vi.clearAllMocks();
});

afterEach(() => {
	cleanup();
	localStorage.clear();
	clearAllFavorites();
});

// ---------------------------------------------------------------------------
// StoryCardSkeleton
// ---------------------------------------------------------------------------

describe("StoryCardSkeleton", () => {
	it("renders without throwing", () => {
		render(<StoryCardSkeleton />);
		// The skeleton renders an article element with an animate-pulse child.
		const article = document.querySelector("article");
		expect(article).not.toBeNull();
	});
});

// ---------------------------------------------------------------------------
// StoryCard — rendering
// ---------------------------------------------------------------------------

describe("StoryCard rendering", () => {
	it("renders the story title", () => {
		render(<StoryCard story={makeStory()} />);
		expect(
			screen.getByRole("heading", { name: "A Test Story Title" }),
		).toBeDefined();
	});

	it("renders the story author", () => {
		render(<StoryCard story={makeStory()} />);
		expect(screen.getByText(/by author42/i)).toBeDefined();
	});

	it("renders the score", () => {
		render(<StoryCard story={makeStory()} />);
		expect(screen.getByText(/210 points/i)).toBeDefined();
	});

	it("renders the comment count", () => {
		render(<StoryCard story={makeStory()} />);
		expect(screen.getByText(/17 comments/i)).toBeDefined();
	});

	it("renders the domain extracted from the URL", () => {
		render(
			<StoryCard story={makeStory({ url: "https://blog.example.org/p" })} />,
		);
		expect(screen.getByText(/blog\.example\.org/i)).toBeDefined();
	});

	it("falls back to HN domain when URL is null", () => {
		render(<StoryCard story={makeStory({ url: null })} />);
		expect(screen.getByText(/news\.ycombinator\.com/i)).toBeDefined();
	});

	it("shows 'unknown' for a null author", () => {
		render(<StoryCard story={makeStory({ by: null })} />);
		expect(screen.getByText(/by unknown/i)).toBeDefined();
	});

	it("shows a rank badge when rank prop is provided", () => {
		render(<StoryCard story={makeStory()} rank={3} />);
		expect(screen.getByText("03")).toBeDefined();
	});

	it("omits the rank badge when rank prop is omitted", () => {
		render(<StoryCard story={makeStory()} />);
		expect(screen.queryByText(/^\d{2}$/)).toBeNull();
	});

	it("shows 'Read article' button for stories with a URL", () => {
		render(<StoryCard story={makeStory({ url: "https://example.com" })} />);
		expect(screen.getByRole("button", { name: /read article/i })).toBeDefined();
	});

	it("shows 'Open post' button for URL-less stories", () => {
		render(<StoryCard story={makeStory({ url: null })} />);
		expect(screen.getByRole("button", { name: /open post/i })).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// StoryCard — link actions
// ---------------------------------------------------------------------------

describe("StoryCard link actions", () => {
	it("'Read article' calls openLink with the story URL", () => {
		render(
			<StoryCard story={makeStory({ url: "https://article.example.com" })} />,
		);
		fireEvent.click(screen.getByRole("button", { name: /read article/i }));
		expect(openLink).toHaveBeenCalledWith("https://article.example.com");
	});

	it("'Open post' calls openLink with the HN discussion URL when story has no URL", () => {
		render(<StoryCard story={makeStory({ id: 12345, url: null })} />);
		fireEvent.click(screen.getByRole("button", { name: /open post/i }));
		expect(openLink).toHaveBeenCalledWith(
			"https://news.ycombinator.com/item?id=12345",
		);
	});

	it("'Open discussion' always calls openLink with the HN discussion URL", () => {
		render(<StoryCard story={makeStory({ id: 99999 })} />);
		fireEvent.click(screen.getByRole("button", { name: /open discussion/i }));
		expect(openLink).toHaveBeenCalledWith(
			"https://news.ycombinator.com/item?id=99999",
		);
	});
});

// ---------------------------------------------------------------------------
// StoryCard — favorite toggle
// ---------------------------------------------------------------------------

describe("StoryCard favorite toggle", () => {
	it("renders with 'Save to favorites' aria-label when not yet saved", () => {
		render(<StoryCard story={makeStory()} />);
		const btn = screen.getByRole("button", { name: /save to favorites/i });
		expect(btn).toBeDefined();
		expect(btn.getAttribute("aria-pressed")).toBe("false");
	});

	it("clicking the favorite button adds the story to the store", () => {
		const story = makeStory({ id: 777 });
		render(<StoryCard story={story} />);

		fireEvent.click(screen.getByRole("button", { name: /save to favorites/i }));

		expect(isFavorited(777)).toBe(true);
	});

	it("aria-label changes to 'Remove from favorites' after saving", () => {
		render(<StoryCard story={makeStory()} />);
		fireEvent.click(screen.getByRole("button", { name: /save to favorites/i }));

		// After clicking, the button label should flip.
		expect(
			screen.getByRole("button", { name: /remove from favorites/i }),
		).toBeDefined();
	});

	it("aria-pressed is true when the story is favorited", () => {
		render(<StoryCard story={makeStory()} />);
		fireEvent.click(screen.getByRole("button", { name: /save to favorites/i }));

		const btn = screen.getByRole("button", { name: /remove from favorites/i });
		expect(btn.getAttribute("aria-pressed")).toBe("true");
	});

	it("clicking the favorite button again removes the story from the store", () => {
		const story = makeStory({ id: 888 });
		render(<StoryCard story={story} />);

		// Save
		fireEvent.click(screen.getByRole("button", { name: /save to favorites/i }));
		expect(isFavorited(888)).toBe(true);

		// Remove
		fireEvent.click(
			screen.getByRole("button", { name: /remove from favorites/i }),
		);
		expect(isFavorited(888)).toBe(false);
	});

	it("shows 'Saved' text when favorited", () => {
		render(<StoryCard story={makeStory()} />);
		fireEvent.click(screen.getByRole("button", { name: /save to favorites/i }));
		expect(screen.getByText("Saved")).toBeDefined();
	});

	it("shows 'Save' text when not favorited", () => {
		render(<StoryCard story={makeStory()} />);
		expect(screen.getByText("Save")).toBeDefined();
	});
});
