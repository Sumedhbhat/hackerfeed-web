import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FavoritesPage } from "#/components/favorites-page";
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
