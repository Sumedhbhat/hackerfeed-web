import type { HackerNewsStoryRecord } from "@hackerfeed/entities/hacker-news";
import { StoryListSkeleton } from "@hackerfeed/ui/molecules/StoryListSkeleton";
import {
	cleanup,
	fireEvent,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StoryCard } from "#/components/organisms/story/StoryCard";
import { clearAllFavorites, isFavorited } from "#/lib/favorites-store";
import { renderWithQueryClient } from "#/test/renderWithQueryClient";

const authMock = vi.hoisted(() => ({
	isLoading: false,
	user: null as { id: string } | null,
}));

const trpcMock = vi.hoisted(() => ({
	add: vi.fn(),
	clear: vi.fn(),
	me: vi.fn(),
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

vi.mock("#/lib/trpc/client", () => ({
	createTrpcClient: vi.fn(() => ({
		account: { me: { query: trpcMock.me } },
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
	trpcMock.add.mockResolvedValue(undefined);
	trpcMock.clear.mockResolvedValue(undefined);
	trpcMock.list.mockResolvedValue([]);
	trpcMock.me.mockResolvedValue({ preferences: { chatProvider: "chatgpt" } });
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

describe("StoryListSkeleton", () => {
	it("tells assistive tech that stories are loading", () => {
		renderWithQueryClient(<StoryListSkeleton count={3} />);
		expect(
			screen.getByRole("status", { name: "Loading stories" }),
		).toBeDefined();
	});
});

describe("StoryCard rendering", () => {
	it("renders the story title", () => {
		renderWithQueryClient(<StoryCard story={makeStory()} />);
		expect(
			screen.getByRole("heading", { name: "A Test Story Title" }),
		).toBeDefined();
	});

	it("renders the story author", () => {
		renderWithQueryClient(<StoryCard story={makeStory()} />);
		expect(screen.getByText(/author42/i)).toBeDefined();
	});

	it("renders the score", () => {
		renderWithQueryClient(<StoryCard story={makeStory()} />);
		expect(screen.getByText(/210 points/i)).toBeDefined();
	});

	it("renders the comment count", () => {
		renderWithQueryClient(<StoryCard story={makeStory()} />);
		expect(screen.getByRole("link", { name: /^17 comments: / })).toBeDefined();
	});

	it("renders the domain extracted from the URL", () => {
		renderWithQueryClient(
			<StoryCard story={makeStory({ url: "https://blog.example.org/p" })} />,
		);
		expect(screen.getByText(/blog\.example\.org/i)).toBeDefined();
	});

	it("leaves the domain out for posts without a URL", () => {
		renderWithQueryClient(<StoryCard story={makeStory({ url: null })} />);
		expect(screen.queryByText(/news\.ycombinator\.com/i)).toBeNull();
	});

	it("omits the author when by is null", () => {
		renderWithQueryClient(<StoryCard story={makeStory({ by: null })} />);
		expect(screen.queryByText(/unknown/i)).toBeNull();
	});

	it("has no separate 'Read article' action: the title is the link", () => {
		renderWithQueryClient(
			<StoryCard story={makeStory({ url: "https://example.com" })} />,
		);
		expect(screen.queryByRole("link", { name: /read article/i })).toBeNull();
		expect(
			screen.getByRole("link", { name: "A Test Story Title" }),
		).toBeDefined();
	});
});

describe("StoryCard link actions", () => {
	it("links an article's title to the story URL in a new tab", () => {
		renderWithQueryClient(
			<StoryCard story={makeStory({ url: "https://article.example.com" })} />,
		);
		const link = screen.getByRole("link", { name: "A Test Story Title" });
		expect(link.getAttribute("href")).toBe("https://article.example.com");
		expect(link.getAttribute("target")).toBe("_blank");
		expect(link.getAttribute("rel")).toBe("noopener noreferrer");
	});

	it.each([
		["Ask HN: How do you plan?", null],
		["Show HN: A tiny tool", "https://tool.example.com"],
		["A post with no link", null],
	])("opens the in-app discussion for %s", (title, url) => {
		renderWithQueryClient(
			<StoryCard story={makeStory({ id: 777, title, url })} />,
		);
		const link = within(screen.getByRole("heading", { level: 2 })).getByRole(
			"link",
		);
		expect(link.getAttribute("href")).toBe("/story/777");
		expect(link.getAttribute("target")).toBeNull();
	});

	it("the comment count links to the internal discussion page", () => {
		renderWithQueryClient(<StoryCard story={makeStory({ id: 99999 })} />);
		const link = screen.getByRole("link", { name: /^17 comments: /i });
		expect(link).toBeDefined();
		expect(link.getAttribute("href")).toContain("99999");
	});

	it("'Chat with AI' opens a ChatGPT prompt about the story in a new tab by default", () => {
		renderWithQueryClient(<StoryCard story={makeStory({ id: 4242 })} />);
		const link = screen.getByRole("link", { name: /^chat with ai: /i });
		const href = new URL(link.getAttribute("href") ?? "");
		expect(href.origin).toBe("https://chatgpt.com");
		expect(href.searchParams.get("q")).toContain("item?id=4242");
		expect(link.getAttribute("target")).toBe("_blank");
		expect(link.getAttribute("title")).toBe("Opens ChatGPT in a new tab");
	});

	it("'Chat with AI' opens the reader's chosen chat", async () => {
		authMock.user = { id: "workos-story-viewer" };
		trpcMock.me.mockResolvedValue({
			preferences: { chatProvider: "claude" },
		});
		renderWithQueryClient(<StoryCard story={makeStory({ id: 4242 })} />);
		const link = screen.getByRole("link", { name: /^chat with ai: /i });

		await waitFor(() =>
			expect(link.getAttribute("title")).toBe("Opens Claude in a new tab"),
		);
		const href = new URL(link.getAttribute("href") ?? "");
		expect(href.origin + href.pathname).toBe("https://claude.ai/new");
		expect(href.searchParams.get("q")).toContain("item?id=4242");
	});

	it("records signed-in title clicks as reads", () => {
		authMock.user = { id: "workos-story-viewer" };
		const story = makeStory();
		renderWithQueryClient(<StoryCard story={story} />);

		fireEvent.click(screen.getByRole("link", { name: story.title ?? "" }));

		expect(trpcMock.viewStory.mock.calls).toEqual([
			[{ action: "read", story }],
		]);
	});

	it("records middle-click reads but not other auxiliary clicks", () => {
		authMock.user = { id: "workos-story-viewer" };
		const story = makeStory();
		renderWithQueryClient(<StoryCard story={story} />);
		const title = screen.getByRole("link", { name: story.title ?? "" });

		fireEvent(title, new MouseEvent("auxclick", { bubbles: true, button: 1 }));
		fireEvent(title, new MouseEvent("auxclick", { bubbles: true, button: 2 }));

		expect(trpcMock.viewStory.mock.calls).toEqual([
			[{ action: "read", story }],
		]);
	});

	it("greys the title when the reader viewed the story before, on any device", () => {
		const { rerender } = renderWithQueryClient(
			<StoryCard story={{ ...makeStory(), lastViewedAt: null }} />,
		);
		const title = screen.getByRole("link", { name: "A Test Story Title" });
		expect(title.hasAttribute("data-viewed")).toBe(false);

		rerender(
			<StoryCard
				story={{
					...makeStory(),
					lastViewedAt: new Date("2026-11-20T09:30:00Z"),
				}}
			/>,
		);
		expect(title.hasAttribute("data-viewed")).toBe(true);
		expect(screen.getByText(/^Viewed /)).toBeDefined();
	});

	it("refreshes last-viewed times once a view is recorded", async () => {
		authMock.user = { id: "workos-story-viewer" };
		const { queryClient } = renderWithQueryClient(
			<StoryCard story={makeStory()} />,
		);
		const invalidate = vi.spyOn(queryClient, "invalidateQueries");

		fireEvent.click(screen.getByRole("link", { name: "A Test Story Title" }));

		await waitFor(() =>
			expect(invalidate).toHaveBeenCalledWith({
				queryKey: ["views", "stories-last-viewed"],
			}),
		);
	});

	it("records signed-in discussion and AI chat opens", () => {
		authMock.user = { id: "workos-story-viewer" };
		const story = makeStory();
		renderWithQueryClient(<StoryCard story={story} />);

		fireEvent.click(screen.getByRole("link", { name: /^17 comments: / }));
		fireEvent.click(screen.getByRole("link", { name: /^chat with ai: /i }));

		expect(trpcMock.viewStory.mock.calls).toEqual([
			[{ action: "discussion_opened", story }],
			[{ action: "chat_opened", story }],
		]);
	});

	it("does not record signed-out story clicks", () => {
		renderWithQueryClient(<StoryCard story={makeStory()} />);

		fireEvent.click(screen.getByRole("link", { name: "A Test Story Title" }));

		expect(trpcMock.viewStory).not.toHaveBeenCalled();
	});
});

describe("StoryCard favorite toggle", () => {
	it("names the save button after the story when not yet saved", () => {
		renderWithQueryClient(<StoryCard story={makeStory()} />);
		const btn = screen.getByRole("button", {
			name: /^save a test story title$/i,
		});
		expect(btn).toBeDefined();
		expect(btn.getAttribute("aria-pressed")).toBe("false");
	});

	it("clicking the favorite button adds the story to the store", () => {
		const story = makeStory({ id: 777 });
		renderWithQueryClient(<StoryCard story={story} />);

		fireEvent.click(
			screen.getByRole("button", { name: /^save a test story title$/i }),
		);

		expect(isFavorited(777)).toBe(true);
	});

	it("reports the saved state through its name and aria-pressed", () => {
		renderWithQueryClient(<StoryCard story={makeStory()} />);
		fireEvent.click(
			screen.getByRole("button", { name: /^save a test story title$/i }),
		);

		expect(
			screen.getByRole("button", {
				name: /^saved a test story title$/i,
				pressed: true,
			}),
		).toBeDefined();
	});

	it("aria-pressed is true when the story is favorited", () => {
		renderWithQueryClient(<StoryCard story={makeStory()} />);
		fireEvent.click(
			screen.getByRole("button", { name: /^save a test story title$/i }),
		);

		const btn = screen.getByRole("button", {
			name: /^saved a test story title$/i,
		});
		expect(btn.getAttribute("aria-pressed")).toBe("true");
	});

	it("clicking the favorite button again removes the story from the store", () => {
		const story = makeStory({ id: 888 });
		renderWithQueryClient(<StoryCard story={story} />);

		fireEvent.click(
			screen.getByRole("button", { name: /^save a test story title$/i }),
		);
		expect(isFavorited(888)).toBe(true);

		fireEvent.click(
			screen.getByRole("button", {
				name: /^saved a test story title$/i,
				pressed: true,
			}),
		);
		expect(isFavorited(888)).toBe(false);
	});

	it("shows 'Save' text when not favorited", () => {
		renderWithQueryClient(<StoryCard story={makeStory()} />);
		expect(screen.getByText("Save")).toBeDefined();
	});

	it("reflects backend favorite state for authenticated users", async () => {
		const story = makeStory({ id: 901 });
		authMock.user = { id: "workos-story-card-backend-state" };
		trpcMock.list.mockResolvedValue([story]);

		renderWithQueryClient(<StoryCard story={story} />);

		await waitFor(() => {
			expect(
				screen.getByRole("button", {
					name: /^saved a test story title$/i,
					pressed: true,
				}),
			).toBeDefined();
		});
	});

	it("saves through the backend for authenticated users", async () => {
		const story = makeStory({ id: 902 });
		authMock.user = { id: "workos-story-card-add" };
		trpcMock.list.mockResolvedValue([]);

		renderWithQueryClient(<StoryCard story={story} />);
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

		renderWithQueryClient(<StoryCard story={story} />);
		await waitFor(() => {
			expect(
				screen.getByRole("button", {
					name: /^saved a test story title$/i,
					pressed: true,
				}),
			).toBeDefined();
		});

		fireEvent.click(
			screen.getByRole("button", {
				name: /^saved a test story title$/i,
				pressed: true,
			}),
		);

		expect(trpcMock.remove).toHaveBeenCalledWith({ hnStoryId: 903 });
	});
});
