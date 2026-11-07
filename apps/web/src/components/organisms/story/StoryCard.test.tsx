import type { HackerNewsStoryRecord } from "@hackerfeed/hacker-news/records";
import { StoryCardSkeleton } from "@hackerfeed/ui/molecules/StoryCardSkeleton";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StoryCard } from "#/components/organisms/story/StoryCard";
import { clearAllFavorites, isFavorited } from "#/lib/favorites-store";

const authMock = vi.hoisted(() => ({
	isLoading: false,
	user: null as { id: string } | null,
}));

const flagsMock = vi.hoisted(() => ({ aiChat: true }));

const trpcMock = vi.hoisted(() => ({
	add: vi.fn(),
	clear: vi.fn(),
	list: vi.fn(),
	remove: vi.fn(),
	viewStory: vi.fn(),
}));

vi.mock("#/hooks/useAuthSession", () => ({
	useAuthSession: () => ({
		isLoading: authMock.isLoading,
		user: authMock.user,
	}),
}));

vi.mock("#/hooks/useFeatureFlags", () => ({
	useFeatureFlag: (name: keyof typeof flagsMock) => flagsMock[name],
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

// Mock createLink from @tanstack/react-router so the link atoms render plain
// anchors (with route params filled in) without a full RouterProvider.
vi.mock("@tanstack/react-router", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@tanstack/react-router")>();
	return {
		...actual,
		createLink:
			(Anchor: React.ComponentType<Record<string, unknown>>) =>
			({
				to,
				params,
				...rest
			}: {
				to: string;
				params?: Record<string, unknown>;
				[key: string]: unknown;
			}) => (
				<Anchor
					{...rest}
					href={
						params
							? to.replace(/\$(\w+)/g, (_, k) => String(params[k] ?? ""))
							: to
					}
				/>
			),
	};
});

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

beforeEach(() => {
	authMock.isLoading = false;
	authMock.user = null;
	flagsMock.aiChat = true;
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

describe("StoryCardSkeleton", () => {
	it("renders without throwing", () => {
		render(
			<ul>
				<StoryCardSkeleton />
			</ul>,
		);
		expect(document.querySelector("li")).not.toBeNull();
	});
});

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
		expect(screen.getByText(/210 points/i)).toBeDefined();
	});

	it("renders the comment count", () => {
		render(<StoryCard story={makeStory()} />);
		expect(screen.getByRole("link", { name: /^17 comments: / })).toBeDefined();
	});

	it("renders the domain extracted from the URL", () => {
		render(
			<StoryCard story={makeStory({ url: "https://blog.example.org/p" })} />,
		);
		expect(screen.getByText(/blog\.example\.org/i)).toBeDefined();
	});

	it("leaves the domain out for posts without a URL", () => {
		render(<StoryCard story={makeStory({ url: null })} />);
		expect(screen.queryByText(/news\.ycombinator\.com/i)).toBeNull();
	});

	it("omits the author when by is null", () => {
		render(<StoryCard story={makeStory({ by: null })} />);
		expect(screen.queryByText(/unknown/i)).toBeNull();
	});

	it("shows 'Read article' for stories with a URL", () => {
		render(<StoryCard story={makeStory({ url: "https://example.com" })} />);
		expect(screen.getByRole("link", { name: /read article/i })).toBeDefined();
	});

	it("shows 'Open on HN' for URL-less stories", () => {
		render(<StoryCard story={makeStory({ url: null })} />);
		expect(screen.getByRole("link", { name: /^open on hn: /i })).toBeDefined();
	});
});

describe("StoryCard link actions", () => {
	it("links the title and 'Read article' to the story URL in a new tab", () => {
		render(
			<StoryCard story={makeStory({ url: "https://article.example.com" })} />,
		);
		for (const link of [
			screen.getByRole("link", { name: "A Test Story Title" }),
			screen.getByRole("link", { name: /read article/i }),
		]) {
			expect(link.getAttribute("href")).toBe("https://article.example.com");
			expect(link.getAttribute("target")).toBe("_blank");
			expect(link.getAttribute("rel")).toBe("noopener noreferrer");
		}
	});

	it("links 'Open post' to the HN discussion when story has no URL", () => {
		render(<StoryCard story={makeStory({ id: 12345, url: null })} />);
		expect(
			screen.getByRole("link", { name: /^open on hn: /i }).getAttribute("href"),
		).toBe("https://news.ycombinator.com/item?id=12345");
	});

	it("the comment count links to the internal discussion page", () => {
		render(<StoryCard story={makeStory({ id: 99999 })} />);
		const link = screen.getByRole("link", { name: /^17 comments: /i });
		expect(link).toBeDefined();
		expect(link.getAttribute("href")).toContain("99999");
	});

	it("'Ask AI' opens the in-app AI chat for the story", () => {
		render(<StoryCard story={makeStory({ id: 4242 })} />);
		const link = screen.getByRole("link", { name: /^ask ai about/i });
		expect(link.getAttribute("href")).toBe("/chat/4242");
		expect(link.getAttribute("target")).toBeNull();
	});

	it("hides 'Ask AI' while the aiChat flag is off", () => {
		flagsMock.aiChat = false;
		render(<StoryCard story={makeStory()} />);
		expect(screen.queryByRole("link", { name: /^ask ai about/i })).toBeNull();
	});

	it("records signed-in title and primary-action clicks as separate views", () => {
		authMock.user = { id: "workos-story-viewer" };
		const story = makeStory();
		render(<StoryCard story={story} />);

		fireEvent.click(screen.getByRole("link", { name: story.title ?? "" }));
		fireEvent.click(screen.getByRole("link", { name: /read article/i }));

		expect(trpcMock.viewStory).toHaveBeenCalledTimes(2);
		expect(trpcMock.viewStory).toHaveBeenNthCalledWith(1, {
			action: "read",
			story,
		});
	});

	it("records middle-click reads but not other auxiliary clicks", () => {
		authMock.user = { id: "workos-story-viewer" };
		const story = makeStory();
		render(<StoryCard story={story} />);

		fireEvent(
			screen.getByRole("link", { name: story.title ?? "" }),
			new MouseEvent("auxclick", { bubbles: true, button: 1 }),
		);
		fireEvent(
			screen.getByRole("link", { name: /read article/i }),
			new MouseEvent("auxclick", { bubbles: true, button: 1 }),
		);
		fireEvent(
			screen.getByRole("link", { name: /read article/i }),
			new MouseEvent("auxclick", { bubbles: true, button: 2 }),
		);

		expect(trpcMock.viewStory.mock.calls).toEqual([
			[{ action: "read", story }],
			[{ action: "read", story }],
		]);
	});

	it("records signed-in discussion and AI chat opens", () => {
		authMock.user = { id: "workos-story-viewer" };
		const story = makeStory();
		render(<StoryCard story={story} />);

		fireEvent.click(screen.getByRole("link", { name: /^17 comments: / }));
		fireEvent.click(screen.getByRole("link", { name: /^ask ai about/i }));

		expect(trpcMock.viewStory.mock.calls).toEqual([
			[{ action: "discussion_opened", story }],
			[{ action: "chat_opened", story }],
		]);
	});

	it("does not record signed-out story clicks", () => {
		render(<StoryCard story={makeStory()} />);

		fireEvent.click(screen.getByRole("link", { name: /read article/i }));

		expect(trpcMock.viewStory).not.toHaveBeenCalled();
	});
});

describe("StoryCard favorite toggle", () => {
	it("names the save button after the story when not yet saved", () => {
		render(<StoryCard story={makeStory()} />);
		const btn = screen.getByRole("button", {
			name: /^save a test story title$/i,
		});
		expect(btn).toBeDefined();
		expect(btn.getAttribute("aria-pressed")).toBe("false");
	});

	it("clicking the favorite button adds the story to the store", () => {
		const story = makeStory({ id: 777 });
		render(<StoryCard story={story} />);

		fireEvent.click(
			screen.getByRole("button", { name: /^save a test story title$/i }),
		);

		expect(isFavorited(777)).toBe(true);
	});

	it("keeps its label and reports the saved state through aria-pressed", () => {
		render(<StoryCard story={makeStory()} />);
		fireEvent.click(
			screen.getByRole("button", { name: /^save a test story title$/i }),
		);

		expect(
			screen.getByRole("button", {
				name: /^save a test story title$/i,
				pressed: true,
			}),
		).toBeDefined();
	});

	it("aria-pressed is true when the story is favorited", () => {
		render(<StoryCard story={makeStory()} />);
		fireEvent.click(
			screen.getByRole("button", { name: /^save a test story title$/i }),
		);

		const btn = screen.getByRole("button", {
			name: /^save a test story title$/i,
		});
		expect(btn.getAttribute("aria-pressed")).toBe("true");
	});

	it("clicking the favorite button again removes the story from the store", () => {
		const story = makeStory({ id: 888 });
		render(<StoryCard story={story} />);

		fireEvent.click(
			screen.getByRole("button", { name: /^save a test story title$/i }),
		);
		expect(isFavorited(888)).toBe(true);

		fireEvent.click(
			screen.getByRole("button", {
				name: /^save a test story title$/i,
				pressed: true,
			}),
		);
		expect(isFavorited(888)).toBe(false);
	});

	it("keeps the Save label when favorited so the row does not shift", () => {
		render(<StoryCard story={makeStory()} />);
		fireEvent.click(
			screen.getByRole("button", { name: /^save a test story title$/i }),
		);
		expect(
			screen.getByRole("button", {
				name: /^save a test story title$/i,
				pressed: true,
			}).textContent,
		).toContain("Save");
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
				screen.getByRole("button", {
					name: /^save a test story title$/i,
					pressed: true,
				}),
			).toBeDefined();
		});
	});

	it("saves through the backend for authenticated users", async () => {
		const story = makeStory({ id: 902 });
		authMock.user = { id: "workos-story-card-add" };
		trpcMock.list.mockResolvedValue([]);

		render(<StoryCard story={story} />);
		await waitFor(() => expect(trpcMock.list).toHaveBeenCalled());

		fireEvent.click(
			screen.getByRole("button", { name: /^save a test story title$/i }),
		);

		expect(trpcMock.add).toHaveBeenCalledWith(story);
	});

	it("removes through the backend for authenticated users", async () => {
		const story = makeStory({ id: 903 });
		authMock.user = { id: "workos-story-card-remove" };
		trpcMock.list.mockResolvedValue([story]);

		render(<StoryCard story={story} />);
		await waitFor(() => {
			expect(
				screen.getByRole("button", {
					name: /^save a test story title$/i,
					pressed: true,
				}),
			).toBeDefined();
		});

		fireEvent.click(
			screen.getByRole("button", {
				name: /^save a test story title$/i,
				pressed: true,
			}),
		);

		expect(trpcMock.remove).toHaveBeenCalledWith({ hnStoryId: 903 });
	});
});
