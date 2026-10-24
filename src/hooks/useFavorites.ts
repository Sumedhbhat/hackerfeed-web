import { useStore } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { useEffect } from "react";
import { reportError } from "#/lib/errors/report-error";
import {
	clearAllFavorites,
	favoritesStore,
	toggleFavorite,
} from "#/lib/favorites-store";
import type { HackerNewsStoryRecord } from "#/lib/hacker-news/queries";
import { createTrpcClient } from "#/lib/trpc/client";
import { useAuthSession } from "./useAuthSession";

export type UseFavoritesReturn = {
	count: number;
	isFavorited: (id: number) => boolean;
	toggleFavorite: (story: HackerNewsStoryRecord) => void;
	/** Most recent first. */
	getFavorites: () => HackerNewsStoryRecord[];
	clearAllFavorites: () => void;
};

type BackendFavoritesState = {
	items: HackerNewsStoryRecord[] | null;
	userId: string | null;
};

const backendFavoritesStore = new Store<BackendFavoritesState>({
	items: null,
	userId: null,
});

let loadingUserId: string | null = null;

export function useFavorites(): UseFavoritesReturn {
	const { user } = useAuthSession();
	const items = useStore(favoritesStore, (state) => state.items);
	const backendFavorites = useStore(backendFavoritesStore, (state) => state);
	const workosUserId = user?.id;
	const activeFavorites =
		backendFavorites.userId === workosUserId && backendFavorites.items
			? backendFavorites.items
			: Array.from(items.values()).reverse();

	useEffect(() => {
		if (!workosUserId) {
			if (
				backendFavoritesStore.state.items !== null ||
				backendFavoritesStore.state.userId !== null
			) {
				backendFavoritesStore.setState(() => ({ items: null, userId: null }));
			}
			return;
		}

		if (
			backendFavoritesStore.state.userId === workosUserId ||
			loadingUserId === workosUserId
		) {
			return;
		}

		let isCurrent = true;
		loadingUserId = workosUserId;
		const authenticatedUserId = workosUserId;

		async function loadBackendFavorites() {
			try {
				const stories = await createTrpcClient().favorites.list.query();

				if (isCurrent) {
					backendFavoritesStore.setState(() => ({
						items: stories,
						userId: authenticatedUserId,
					}));
				}
			} catch (error) {
				reportError("Database favorites load failed", error, {
					action: "load",
					message: "Sorry, we couldn't load your saved stories.",
					workosUserId: authenticatedUserId,
				});
			} finally {
				if (loadingUserId === authenticatedUserId) {
					loadingUserId = null;
				}
			}
		}

		void loadBackendFavorites();

		return () => {
			isCurrent = false;
		};
	}, [workosUserId]);

	function isFavorited(id: number): boolean {
		return activeFavorites.some((story) => story.id === id);
	}

	function toggleActiveFavorite(story: HackerNewsStoryRecord): void {
		if (!workosUserId) {
			toggleFavorite(story);
			return;
		}

		const authenticatedUserId = workosUserId;
		const wasFavorited = isFavorited(story.id);
		const previousBackendFavorites = activeFavorites;
		const nextBackendFavorites = wasFavorited
			? activeFavorites.filter((favorite) => favorite.id !== story.id)
			: [story, ...activeFavorites];

		backendFavoritesStore.setState(() => ({
			items: nextBackendFavorites,
			userId: authenticatedUserId,
		}));

		async function persistFavoriteChange() {
			try {
				const client = createTrpcClient();

				if (wasFavorited) {
					await client.favorites.remove.mutate({ hnStoryId: story.id });
				} else {
					await client.favorites.add.mutate(story);
				}
			} catch (error) {
				backendFavoritesStore.setState(() => ({
					items: previousBackendFavorites,
					userId: authenticatedUserId,
				}));
				reportError("Database favorite mutation failed", error, {
					action: wasFavorited ? "remove" : "save",
					message: wasFavorited
						? "Sorry, we couldn't remove this story from your favorites."
						: "Sorry, we couldn't save this story to your favorites.",
					hnStoryId: story.id,
					workosUserId: authenticatedUserId,
				});
			}
		}

		void persistFavoriteChange();
	}

	function clearActiveFavorites(): void {
		if (!workosUserId) {
			clearAllFavorites();
			return;
		}

		const authenticatedUserId = workosUserId;
		const previousBackendFavorites = activeFavorites;
		backendFavoritesStore.setState(() => ({
			items: [],
			userId: authenticatedUserId,
		}));

		async function persistClearFavorites() {
			try {
				await createTrpcClient().favorites.clear.mutate();
			} catch (error) {
				backendFavoritesStore.setState(() => ({
					items: previousBackendFavorites,
					userId: authenticatedUserId,
				}));
				reportError("Database favorites clear failed", error, {
					action: "remove",
					message: "Sorry, we couldn't clear your favorites.",
					workosUserId: authenticatedUserId,
				});
			}
		}

		void persistClearFavorites();
	}

	return {
		count: activeFavorites.length,
		isFavorited,
		toggleFavorite: toggleActiveFavorite,
		getFavorites: () => activeFavorites,
		clearAllFavorites: clearActiveFavorites,
	};
}
