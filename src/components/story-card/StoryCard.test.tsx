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
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StoryCard, StoryCardSkeleton } from "#/components/story-card";
import { clearAllFavorites, isFavorited } from "#/lib/favorites-store";
import type { HackerNewsStoryRecord } from "#/lib/hacker-news/queries";

const authMock = vi.hoisted(() => ({
	isLoading: false,
	user: null as { id: string } | null,
}));

const trpcMock = vi.hoisted(() => ({
	add: vi.fn(),
	clear: vi.fn(),
	list: vi.fn(),
	remove: vi.fn(),
	viewStory: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock openLink so tests don't actually open browser windows
// ---------------------------------------------------------------------------

vi.mock("#/lib/open-link", () => ({
	openLink: vi.fn(),
}));

vi.mock("#/hooks/useAuthSession", () => ({
	useAuthSession: () => ({
		isLoading: authMock.isLoading,
		user: authMock.user,
	}),
}));

vi.mock("#/lib/trpc/client", () => ({
	createTrpcClient: vi.fn(() => ({
		favorites: {
			add: { mutate: trpcMock.add },
			clear: { mutate: trpcMock.clear },
			list: { query: trpcMock.list },
			remove: { mutate: trpcMock.remove },
		},
		views: {
			story: { mutate: trpcMock.viewStory },
		},
	})),
}));

// Mock Link from @tanstack/react-router so tests don't need a full RouterProvider.
vi.mock("@tanstack/react-router", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@tanstack/react-router")>();
	return {
		...actual,
		Link: ({
			children,
			to,
			params,
			className,
		}: {
			children: React.ReactNode;
			to: string;
			params?: Record<string, unknown>;
			className?: string;
		}) => (
			<a
				href={
					params
						? to.replace(/\$(\w+)/g, (_, k) => String(params[k] ?? ""))
						: to
				}
				className={className}
			>
				{children}
			</a>
		),
	};
});

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
		kids: overrides.kids ?? [],
	};
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	authMock.isLoading = false;
	authMock.user = null;
	trpcMock.add.mockResolvedValue(undefined);
	trpcMock.clear.mockResolvedValue(undefined);
	trpcMock.list.mockResolvedValue([]);
	trpcMock.remove.mockResolvedValue(undefined);
	trpcMock.viewStory.mockResolvedValue(undefined);
	localStorage.clear();
	clearAllFavorites();
	vi.clearAllMocks();
});

afterEach(() => {
	cleanup();
	authMock.isLoading = false;
	authMock.user = null;
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
		expect(screen.getByText(/author42/i)).toBeDefined();
	});

	it("renders the score", () => {
		render(<StoryCard story={makeStory()} />);
		expect(screen.getByText(/210 pts/i)).toBeDefined();
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

	it("omits the author when by is null", () => {
		render(<StoryCard story={makeStory({ by: null })} />);
		expect(screen.queryByText(/unknown/i)).toBeNull();
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

	it("'Discussion' renders a link to the internal discussion page", () => {
		render(<StoryCard story={makeStory({ id: 99999 })} />);
		const link = screen.getByRole("link", { name: /^discussion$/i });
		expect(link).toBeDefined();
		expect(link.getAttribute("href")).toContain("99999");
	});

	it("records signed-in title and primary-action clicks as separate views", () => {
		authMock.user = { id: "workos-story-viewer" };
		const story = makeStory();
		render(<StoryCard story={story} />);

		fireEvent.click(screen.getByRole("heading", { name: story.title ?? "" }));
		fireEvent.click(screen.getByRole("button", { name: /read article/i }));

		expect(trpcMock.viewStory).toHaveBeenCalledTimes(2);
		expect(trpcMock.viewStory).toHaveBeenNthCalledWith(1, story);
		expect(openLink).toHaveBeenCalledTimes(2);
	});

	it("opens the story when background tracking fails", () => {
		authMock.user = { id: "workos-story-viewer" };
		trpcMock.viewStory.mockRejectedValueOnce(new Error("offline"));
		render(<StoryCard story={makeStory()} />);

		fireEvent.click(screen.getByRole("button", { name: /read article/i }));

		expect(trpcMock.viewStory).toHaveBeenCalledTimes(1);
		expect(openLink).toHaveBeenCalledWith("https://example.com/test-article");
	});

	it("does not record signed-out story clicks", () => {
		render(<StoryCard story={makeStory()} />);

		fireEvent.click(screen.getByRole("button", { name: /read article/i }));

		expect(trpcMock.viewStory).not.toHaveBeenCalled();
		expect(openLink).toHaveBeenCalledTimes(1);
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

	it("reflects backend favorite state for authenticated users", async () => {
		const story = makeStory({ id: 901 });
		authMock.user = { id: "workos-story-card-backend-state" };
		trpcMock.list.mockResolvedValue([story]);

		render(<StoryCard story={story} />);

		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: /remove from favorites/i }),
			).toBeDefined();
		});
	});

	it("saves through the backend for authenticated users", async () => {
		const story = makeStory({ id: 902 });
		authMock.user = { id: "workos-story-card-add" };
		trpcMock.list.mockResolvedValue([]);

		render(<StoryCard story={story} />);
		await waitFor(() => expect(trpcMock.list).toHaveBeenCalled());

		fireEvent.click(screen.getByRole("button", { name: /save to favorites/i }));

		expect(trpcMock.add).toHaveBeenCalledWith(story);
	});

	it("removes through the backend for authenticated users", async () => {
		const story = makeStory({ id: 903 });
		authMock.user = { id: "workos-story-card-remove" };
		trpcMock.list.mockResolvedValue([story]);

		render(<StoryCard story={story} />);
		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: /remove from favorites/i }),
			).toBeDefined();
		});

		fireEvent.click(
			screen.getByRole("button", { name: /remove from favorites/i }),
		);

		expect(trpcMock.remove).toHaveBeenCalledWith({ hnStoryId: 903 });
	});
});
