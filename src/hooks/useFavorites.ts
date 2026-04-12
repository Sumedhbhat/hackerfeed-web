import { useStore } from "@tanstack/react-store";
import {
	clearAllFavorites,
	favoritesStore,
	getFavorites,
	toggleFavorite,
} from "#/lib/favorites-store";
import type { HackerNewsStoryRecord } from "#/lib/hacker-news/queries";

export type UseFavoritesReturn = {
	/** Reactive count of saved stories. */
	count: number;
	/** Whether a given story ID is currently favorited. */
	isFavorited: (id: number) => boolean;
	/** Toggle favorite status for a story. */
	toggleFavorite: (story: HackerNewsStoryRecord) => void;
	/** All favorited stories (most-recent-first). */
	getFavorites: () => HackerNewsStoryRecord[];
	/** Remove every saved story. */
	clearAllFavorites: () => void;
};

export function useFavorites(): UseFavoritesReturn {
	// Subscribe to the store so components re-render when favorites change.
	const items = useStore(favoritesStore, (state) => state.items);

	return {
		count: items.size,
		isFavorited: (id: number) => items.has(id),
		toggleFavorite,
		getFavorites,
		clearAllFavorites,
	};
}
