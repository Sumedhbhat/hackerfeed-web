import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FavoritesPage } from "#/components/favorites-page";
import { clearAllFavorites, toggleFavorite } from "#/lib/favorites-store";
import type { HackerNewsStoryRecord } from "#/lib/hacker-news/queries";
import type { SavedPaper } from "#/lib/paper-favorites/schemas";
import { parseFavoritesSearch } from "#/routes/favorites";
import { renderWithQueryClient as render } from "#/test/renderWithQueryClient";

const authMock = vi.hoisted(() => ({
	isLoading: false,
	user: null as { id: string } | null,
}));

const trpcMock = vi.hoisted(() => ({
	add: vi.fn(),
	clear: vi.fn(),
	list: vi.fn(),
	remove: vi.fn(),
	paperClear: vi.fn(),
	paperList: vi.fn(),
	paperRemove: vi.fn(),
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
		paperFavorites: {
			add: { mutate: vi.fn() },
			clear: { mutate: trpcMock.paperClear },
			list: { query: trpcMock.paperList },
			remove: { mutate: trpcMock.paperRemove },
		},
	})),
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (options: unknown) => options,
	Link: ({
		children,
		to,
		className,
	}: {
		children: React.ReactNode;
		to: string;
		className?: string;
	}) => (
		<a href={to} className={className}>
			{children}
		</a>
	),
}));

function makeStory(
	overrides: Partial<HackerNewsStoryRecord> = {},
): HackerNewsStoryRecord {
	return {
		by: "author42",
		descendants: 17,
		id: 12345,
		kids: [],
		score: 210,
		text: null,
		time: Math.floor(Date.now() / 1000) - 3600,
		title: "A Test Story Title",
		type: "story",
		url: "https://example.com/test-article",
		...overrides,
	};
}

beforeEach(() => {
	authMock.isLoading = false;
	authMock.user = null;
	trpcMock.add.mockResolvedValue(undefined);
	trpcMock.clear.mockResolvedValue(undefined);
	trpcMock.list.mockResolvedValue([]);
	trpcMock.remove.mockResolvedValue(undefined);
	trpcMock.paperClear.mockResolvedValue(undefined);
	trpcMock.paperList.mockResolvedValue({ items: [], nextCursor: null });
	trpcMock.paperRemove.mockResolvedValue(undefined);
	localStorage.clear();
	clearAllFavorites();
	vi.clearAllMocks();
});

function savedPaper(overrides: Partial<SavedPaper> = {}): SavedPaper {
	return {
		abstract: null,
		arxivId: "2607.00001",
		authors: ["Ada Lovelace"],
		githubRepo: "https://github.com/example/paper",
		keywords: ["reasoning"],
		paperPublishedAt: "2026-07-10T10:00:00.000Z",
		paperUrl: "https://huggingface.co/papers/2607.00001",
		projectPage: "https://example.com/project",
		savedAt: "2026-07-11T00:00:00.000Z",
		summary: "Canonical summary",
		title: "Saved Reasoning Paper",
		upvotes: 42,
		...overrides,
	};
}

afterEach(() => {
	cleanup();
	authMock.isLoading = false;
	authMock.user = null;
	localStorage.clear();
	clearAllFavorites();
});

describe("favorites route search", () => {
	it("defaults missing and invalid values to stories and accepts papers", () => {
		expect(parseFavoritesSearch({})).toEqual({});
		expect(parseFavoritesSearch({ type: "unknown" })).toEqual({});
		expect(parseFavoritesSearch({ type: "papers" })).toEqual({
			type: "papers",
		});
	});
});

describe("FavoritesPage backend source of truth", () => {
	it("renders backend favorites with database count and saved order", async () => {
		authMock.user = { id: "workos-favorites-page-list" };
		trpcMock.list.mockResolvedValue([
			makeStory({ id: 2, title: "Database newest saved", time: 10 }),
			makeStory({ id: 1, title: "Database oldest saved", time: 20 }),
		]);

		render(<FavoritesPage />);

		await waitFor(() => {
			expect(screen.getByText("Database newest saved")).toBeDefined();
		});

		expect(screen.getByText(/2 stories/i)).toBeDefined();
		expect(screen.getByText("Database oldest saved")).toBeDefined();
		expect(
			screen
				.getAllByRole("heading", { level: 3 })
				.map((heading) => heading.textContent),
		).toEqual(["Database newest saved", "Database oldest saved"]);
	});

	it("does not render local favorites after backend favorites load", async () => {
		toggleFavorite(makeStory({ id: 10, title: "Local saved story" }));
		authMock.user = { id: "workos-favorites-page-source" };
		trpcMock.list.mockResolvedValue([
			makeStory({ id: 20, title: "Database saved story" }),
		]);

		render(<FavoritesPage />);

		await waitFor(() => {
			expect(screen.getByText("Database saved story")).toBeDefined();
		});

		expect(screen.queryByText("Local saved story")).toBeNull();
		expect(screen.getByText(/1 story/i)).toBeDefined();
	});
});

describe("FavoritesPage paper collection", () => {
	it("shows a sign-in action without loading protected paper favorites", () => {
		render(<FavoritesPage activeType="papers" />);

		expect(
			screen.getByRole("heading", { name: "Sign in to view saved papers." }),
		).toBeTruthy();
		expect(
			screen.getByRole("link", { name: /sign in/i }).getAttribute("href"),
		).toBe("/auth/sign-in");
		expect(trpcMock.paperList).not.toHaveBeenCalled();
		expect(screen.queryByRole("button", { name: /clear papers/i })).toBeNull();
	});

	it("renders canonical paper links in newest-saved order and removes with the star", async () => {
		authMock.user = { id: "paper-page-user" };
		trpcMock.paperList.mockResolvedValue({
			items: [
				savedPaper(),
				savedPaper({
					arxivId: "2607.00002",
					title: "Older Paper",
					savedAt: "2026-07-10T00:00:00.000Z",
				}),
			],
			nextCursor: null,
		});
		render(<FavoritesPage activeType="papers" />);

		await screen.findByText("Saved Reasoning Paper");
		const headings = screen.getAllByRole("heading", { level: 2 });
		expect(headings.map((heading) => heading.textContent)).toEqual([
			"Saved Reasoning Paper",
			"Older Paper",
		]);
		expect(
			screen
				.getByRole("link", { name: "Saved Reasoning Paper" })
				.getAttribute("href"),
		).toBe("https://huggingface.co/papers/2607.00001");
		expect(
			screen.getByRole("link", { name: /discuss saved reasoning paper/i }),
		).toBeTruthy();
		expect(screen.getAllByRole("link", { name: /project/i })).toHaveLength(2);
		expect(screen.getAllByRole("link", { name: /code/i })).toHaveLength(2);

		fireEvent.click(
			screen.getByRole("button", {
				name: "Remove Saved Reasoning Paper from favorites",
			}),
		);
		await waitFor(() =>
			expect(trpcMock.paperRemove).toHaveBeenCalledWith({
				arxivId: "2607.00001",
			}),
		);
		expect(screen.queryByText("Saved Reasoning Paper")).toBeNull();
	});

	it("clears only papers after confirmation", async () => {
		authMock.user = { id: "paper-clear-user" };
		trpcMock.paperList.mockResolvedValue({
			items: [savedPaper()],
			nextCursor: null,
		});
		vi.spyOn(window, "confirm").mockReturnValue(true);
		render(<FavoritesPage activeType="papers" />);

		fireEvent.click(
			await screen.findByRole("button", { name: "Clear papers" }),
		);
		await waitFor(() => expect(trpcMock.paperClear).toHaveBeenCalledTimes(1));
		expect(trpcMock.clear).not.toHaveBeenCalled();
		expect(
			await screen.findByText("Your saved papers list is empty."),
		).toBeTruthy();
	});

	it("shows an initial paper load failure and recovers on refresh", async () => {
		authMock.user = { id: "paper-recovery-user" };
		trpcMock.paperList
			.mockRejectedValueOnce(new Error("load failed"))
			.mockResolvedValueOnce({ items: [savedPaper()], nextCursor: null });
		render(<FavoritesPage activeType="papers" />);

		expect((await screen.findByRole("alert")).textContent).toContain(
			"Could not load saved favorites.",
		);
		expect(screen.queryByText(/list is empty/i)).toBeNull();
		fireEvent.click(
			screen.getByRole("button", { name: "Refresh saved favorites" }),
		);

		expect(await screen.findByText("Saved Reasoning Paper")).toBeTruthy();
		expect(trpcMock.paperList).toHaveBeenCalledTimes(2);
		expect(screen.queryByRole("alert")).toBeNull();
	});

	it("exposes accessible URL-driven tabs", () => {
		const onTypeChange = vi.fn();
		render(<FavoritesPage activeType="stories" onTypeChange={onTypeChange} />);
		const stories = screen.getByRole("tab", { name: "Stories" });
		const papers = screen.getByRole("tab", { name: "Papers" });
		expect(stories.getAttribute("aria-selected")).toBe("true");
		expect(stories.getAttribute("tabindex")).toBe("0");
		expect(papers.getAttribute("tabindex")).toBe("-1");
		expect(screen.getByRole("tabpanel").getAttribute("aria-labelledby")).toBe(
			"favorites-stories-tab",
		);
		fireEvent.click(papers);
		expect(onTypeChange).toHaveBeenCalledWith("papers");
		fireEvent.keyDown(stories, { key: "ArrowRight" });
		expect(onTypeChange).toHaveBeenLastCalledWith("papers");
		expect(document.activeElement).toBe(papers);
		fireEvent.keyDown(papers, { key: "Home" });
		expect(onTypeChange).toHaveBeenLastCalledWith("stories");
		expect(document.activeElement).toBe(stories);
		fireEvent.keyDown(stories, { key: "End" });
		expect(onTypeChange).toHaveBeenLastCalledWith("papers");
		expect(document.activeElement).toBe(papers);
		fireEvent.keyDown(papers, { key: "ArrowRight" });
		expect(onTypeChange).toHaveBeenLastCalledWith("stories");
		expect(document.activeElement).toBe(stories);
		fireEvent.keyDown(stories, { key: "ArrowLeft" });
		expect(onTypeChange).toHaveBeenLastCalledWith("papers");
		expect(document.activeElement).toBe(papers);
	});
});
