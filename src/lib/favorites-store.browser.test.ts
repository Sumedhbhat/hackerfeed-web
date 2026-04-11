// @vitest-environment happy-dom
/**
 * Favorites store — persistence, toggle, and clear behavior.
 *
 * Uses jsdom so that localStorage is available, mirroring the real browser
 * runtime the store is designed for.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	clearAllFavorites,
	getFavorites,
	isFavorited,
	toggleFavorite,
} from "#/lib/favorites-store";
import type { HackerNewsStoryRecord } from "#/lib/hacker-news/queries";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStory(
	id: number,
	overrides: Partial<HackerNewsStoryRecord> = {},
): HackerNewsStoryRecord {
	return {
		by: "testuser",
		descendants: 5,
		id,
		kids: [],
		score: 42,
		text: null,
		time: 1_700_000_000 + id,
		title: `Story ${id}`,
		type: "story",
		url: `https://example.com/story-${id}`,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	// Start every test with a clean localStorage and empty store state.
	localStorage.clear();
	clearAllFavorites();
});

afterEach(() => {
	localStorage.clear();
	clearAllFavorites();
});

// ---------------------------------------------------------------------------
// toggleFavorite
// ---------------------------------------------------------------------------

describe("toggleFavorite", () => {
	it("adds a story that is not yet favorited", () => {
		const story = makeStory(1);
		expect(isFavorited(1)).toBe(false);

		toggleFavorite(story);

		expect(isFavorited(1)).toBe(true);
	});

	it("removes a story that is already favorited", () => {
		const story = makeStory(2);
		toggleFavorite(story);
		expect(isFavorited(2)).toBe(true);

		toggleFavorite(story);

		expect(isFavorited(2)).toBe(false);
	});

	it("toggling multiple different stories keeps each one independent", () => {
		const s1 = makeStory(10);
		const s2 = makeStory(11);
		toggleFavorite(s1);
		toggleFavorite(s2);

		expect(isFavorited(10)).toBe(true);
		expect(isFavorited(11)).toBe(true);

		toggleFavorite(s1);

		expect(isFavorited(10)).toBe(false);
		expect(isFavorited(11)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// getFavorites
// ---------------------------------------------------------------------------

describe("getFavorites", () => {
	it("returns an empty array when nothing is saved", () => {
		expect(getFavorites()).toEqual([]);
	});

	it("returns saved stories in reverse insertion order (newest first)", () => {
		const s1 = makeStory(20);
		const s2 = makeStory(21);
		const s3 = makeStory(22);
		toggleFavorite(s1);
		toggleFavorite(s2);
		toggleFavorite(s3);

		const favorites = getFavorites();
		expect(favorites.map((s) => s.id)).toEqual([22, 21, 20]);
	});
});

// ---------------------------------------------------------------------------
// clearAllFavorites
// ---------------------------------------------------------------------------

describe("clearAllFavorites", () => {
	it("removes all saved stories", () => {
		toggleFavorite(makeStory(30));
		toggleFavorite(makeStory(31));
		expect(getFavorites().length).toBe(2);

		clearAllFavorites();

		expect(getFavorites().length).toBe(0);
	});

	it("clears localStorage entry", () => {
		toggleFavorite(makeStory(32));
		clearAllFavorites();

		// After clearing, the storage key should either be absent or hold an
		// empty serialised map.
		const raw = localStorage.getItem("hackerfeed:favorites");
		if (raw !== null) {
			const entries = JSON.parse(raw) as unknown[];
			expect(entries).toHaveLength(0);
		}
	});
});

// ---------------------------------------------------------------------------
// localStorage persistence
// ---------------------------------------------------------------------------

describe("localStorage persistence", () => {
	it("persists a saved story to localStorage", () => {
		const story = makeStory(40);
		toggleFavorite(story);

		const raw = localStorage.getItem("hackerfeed:favorites");
		expect(raw).not.toBeNull();
		const entries = JSON.parse(raw as string) as Array<
			[number, HackerNewsStoryRecord]
		>;
		expect(entries.some(([id]) => id === 40)).toBe(true);
	});

	it("reflects removal in localStorage after un-favoriting", () => {
		const story = makeStory(41);
		toggleFavorite(story);
		toggleFavorite(story); // remove

		const raw = localStorage.getItem("hackerfeed:favorites");
		if (raw !== null) {
			const entries = JSON.parse(raw) as Array<[number, HackerNewsStoryRecord]>;
			expect(entries.every(([id]) => id !== 41)).toBe(true);
		}
	});

	it("store state is backed by the in-memory Map, not re-read from localStorage on each action", () => {
		// Corrupt localStorage after the first write to prove the store does not
		// re-hydrate from storage during subsequent actions.
		const story = makeStory(42);
		toggleFavorite(story);

		// Deliberately corrupt the persisted data.
		localStorage.setItem("hackerfeed:favorites", "CORRUPT");

		// The in-memory store still has the story.
		expect(isFavorited(42)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// isFavorited
// ---------------------------------------------------------------------------

describe("isFavorited", () => {
	it("returns false for an id that was never added", () => {
		expect(isFavorited(9999)).toBe(false);
	});

	it("returns true for an id that has been added", () => {
		toggleFavorite(makeStory(50));
		expect(isFavorited(50)).toBe(true);
	});

	it("returns false after the story is removed", () => {
		const story = makeStory(51);
		toggleFavorite(story);
		toggleFavorite(story);
		expect(isFavorited(51)).toBe(false);
	});
});
