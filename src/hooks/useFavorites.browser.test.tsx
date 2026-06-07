import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFavorites } from "#/hooks/useFavorites";
import { clearAllFavorites, toggleFavorite } from "#/lib/favorites-store";
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
	})),
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

function FavoritesProbe() {
	const favorites = useFavorites();

	return (
		<div>
			<p data-testid="count">{favorites.count}</p>
			<ul>
				{favorites.getFavorites().map((story) => (
					<li key={story.id}>{story.title}</li>
				))}
			</ul>
		</div>
	);
}

beforeEach(() => {
	authMock.isLoading = false;
	authMock.user = null;
	trpcMock.add.mockResolvedValue(undefined);
	trpcMock.clear.mockResolvedValue(undefined);
	trpcMock.list.mockResolvedValue([]);
	trpcMock.remove.mockResolvedValue(undefined);
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

describe("useFavorites backend source of truth", () => {
	it("loads authenticated favorites from the backend and keeps their saved order", async () => {
		authMock.user = { id: "workos-use-favorites-list" };
		trpcMock.list.mockResolvedValue([
			makeStory({ id: 2, title: "Saved newest", time: 10 }),
			makeStory({ id: 1, title: "Saved oldest", time: 20 }),
		]);

		render(<FavoritesProbe />);

		await waitFor(() => {
			expect(screen.getByTestId("count").textContent).toBe("2");
		});
		expect(
			screen.getAllByRole("listitem").map((item) => item.textContent),
		).toEqual(["Saved newest", "Saved oldest"]);
	});

	it("does not use localStorage as source of truth after backend favorites load", async () => {
		toggleFavorite(makeStory({ id: 10, title: "Local saved story" }));
		authMock.user = { id: "workos-use-favorites-source" };
		trpcMock.list.mockResolvedValue([
			makeStory({ id: 20, title: "Database saved story" }),
		]);

		render(<FavoritesProbe />);

		await waitFor(() => {
			expect(screen.getByText("Database saved story")).toBeDefined();
		});
		expect(screen.queryByText("Local saved story")).toBeNull();
		expect(screen.getByTestId("count").textContent).toBe("1");
	});
});
