import { Store } from "@tanstack/store";
import type { HackerNewsStoryRecord } from "#/lib/hacker-news/queries";

const STORAGE_KEY = "hackerfeed:favorites";

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

function loadFromStorage(): Map<number, HackerNewsStoryRecord> {
	if (typeof window === "undefined") return new Map();
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return new Map();
		const entries = JSON.parse(raw) as Array<[number, HackerNewsStoryRecord]>;
		return new Map(entries);
	} catch {
		return new Map();
	}
}

function saveToStorage(map: Map<number, HackerNewsStoryRecord>): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify(Array.from(map.entries())),
		);
	} catch {
		// Quota exceeded or private-browsing restriction — silently ignore.
	}
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export type FavoritesState = {
	/** Keyed by story id for O(1) lookup. */
	items: Map<number, HackerNewsStoryRecord>;
};

export const favoritesStore = new Store<FavoritesState>({
	items: loadFromStorage(),
});

// Keep localStorage in sync whenever the store changes.
favoritesStore.subscribe(() => {
	saveToStorage(favoritesStore.state.items);
});

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export function toggleFavorite(story: HackerNewsStoryRecord): void {
	favoritesStore.setState((prev) => {
		const next = new Map(prev.items);
		if (next.has(story.id)) {
			next.delete(story.id);
		} else {
			next.set(story.id, story);
		}
		return { items: next };
	});
}

export function isFavorited(storyId: number): boolean {
	return favoritesStore.state.items.has(storyId);
}

export function getFavorites(): HackerNewsStoryRecord[] {
	return Array.from(favoritesStore.state.items.values()).reverse();
}
