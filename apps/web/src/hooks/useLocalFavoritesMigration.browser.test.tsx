import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLocalFavoritesMigration } from "#/hooks/useLocalFavoritesMigration";
import { clearAllFavorites, toggleFavorite } from "#/lib/favorites-store";
import type { HackerNewsStoryRecord } from "#/lib/hacker-news/queries";

const authMock = vi.hoisted(() => ({
	isLoading: false,
	user: { id: "workos-local-migration" } as { id: string } | null,
}));

const trpcMock = vi.hoisted(() => ({
	importLocal: vi.fn(),
}));

vi.mock("#/hooks/useAuthSession", () => ({
	useAuthSession: () => authMock,
}));

vi.mock("#/lib/trpc/client", () => ({
	createTrpcClient: vi.fn(() => ({
		favorites: {
			importLocal: { mutate: trpcMock.importLocal },
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
		time: 1_700_000_000,
		title: "A Test Story Title",
		type: "story",
		url: "https://example.com/test-article",
		...overrides,
	};
}

function MigrationProbe() {
	useLocalFavoritesMigration();

	return null;
}

beforeEach(() => {
	authMock.isLoading = false;
	authMock.user = { id: "workos-local-migration" };
	trpcMock.importLocal.mockResolvedValue(undefined);
	localStorage.clear();
	clearAllFavorites();
	vi.clearAllMocks();
});

afterEach(() => {
	localStorage.clear();
	clearAllFavorites();
});

describe("useLocalFavoritesMigration", () => {
	it("skips malformed local favorites during import", async () => {
		const validStory = makeStory({ id: 1, title: "Valid story" });
		const invalidStory = {
			...makeStory({ id: 2, title: "Invalid story" }),
			kids: undefined,
		} as unknown as HackerNewsStoryRecord;

		toggleFavorite(validStory);
		toggleFavorite(invalidStory);

		render(<MigrationProbe />);

		await waitFor(() => {
			expect(trpcMock.importLocal).toHaveBeenCalledWith({
				stories: [validStory],
			});
		});
	});
});
