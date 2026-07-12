import {
	useMutation,
	useMutationState,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { SavedPaper } from "#/lib/paper-favorites/schemas";
import type { PaperFeedPaper } from "#/lib/papers/schemas";
import { createTrpcClient } from "#/lib/trpc/client";
import { useAuthSession } from "./useAuthSession";

const PAGE_LIMIT = 50;
const QUERY_ROOT = ["paperFavorites"] as const;
const MUTATION_KEY = ["paperFavorites", "toggle"] as const;
const CLEAR_MUTATION_KEY = ["paperFavorites", "clear"] as const;

type FavoritesData = SavedPaper[];
type MutationVariables = {
	paper: PaperFeedPaper | SavedPaper;
	remove: boolean;
	epoch: number;
};
type PriorPaper = {
	item: SavedPaper;
	itemIndex: number;
	previousId?: string;
	nextId?: string;
} | null;

function withoutPaper(data: FavoritesData, arxivId: string): FavoritesData {
	return data.filter((item) => item.arxivId !== arxivId);
}

function addPaper(data: FavoritesData, paper: SavedPaper): FavoritesData {
	const next = withoutPaper(data, paper.arxivId);
	return [paper, ...next];
}

function findPriorPaper(
	data: FavoritesData | undefined,
	arxivId: string,
): PriorPaper {
	if (!data) return null;
	const itemIndex = data.findIndex((item) => item.arxivId === arxivId);
	if (itemIndex >= 0) {
		return {
			item: data[itemIndex],
			itemIndex,
			previousId: data[itemIndex - 1]?.arxivId,
			nextId: data[itemIndex + 1]?.arxivId,
		};
	}
	return null;
}

function rollbackPaper(
	current: FavoritesData | undefined,
	prior: PriorPaper,
	arxivId: string,
): FavoritesData | undefined {
	if (!current) return current;
	const next = withoutPaper(current, arxivId);
	if (!prior) return next;
	const previousIndex = prior.previousId
		? next.findIndex((item) => item.arxivId === prior.previousId)
		: -1;
	const nextIndex = prior.nextId
		? next.findIndex((item) => item.arxivId === prior.nextId)
		: -1;
	const insertAt =
		previousIndex >= 0
			? previousIndex + 1
			: nextIndex >= 0
				? nextIndex
				: Math.min(prior.itemIndex, next.length);
	next.splice(insertAt, 0, prior.item);
	return next;
}

export type UsePaperFavoritesReturn = {
	count: number;
	savedPapers: SavedPaper[];
	canFavorite: boolean;
	canClear: boolean;
	error: string | null;
	isFavorited: (arxivId: string) => boolean;
	isPending: (arxivId: string) => boolean;
	isClearPending: boolean;
	isLoading: boolean;
	clearAll: () => void;
	refresh: () => void;
	toggleFavorite: (paper: PaperFeedPaper | SavedPaper) => void;
};

export function usePaperFavorites(): UsePaperFavoritesReturn {
	const { isLoading: isAuthLoading, user } = useAuthSession();
	const queryClient = useQueryClient();
	const userId = user?.id ?? null;
	const [auth, setAuth] = useState(() => ({ userId, epoch: 0 }));
	const [mutationError, setMutationError] = useState<string | null>(null);
	const authTransitioning = auth.userId !== userId;
	const queryKey = [...QUERY_ROOT, auth.userId, auth.epoch] as const;

	useEffect(() => {
		if (auth.userId === userId) return;
		void queryClient.cancelQueries({ queryKey, exact: true });
		queryClient.removeQueries({ queryKey, exact: true });
		for (const candidate of queryClient
			.getMutationCache()
			.findAll({ mutationKey: MUTATION_KEY })) {
			const variables = candidate.state.variables as
				| MutationVariables
				| undefined;
			if (variables?.epoch === auth.epoch) {
				queryClient.getMutationCache().remove(candidate);
			}
		}
		setMutationError(null);
		setAuth({ userId, epoch: auth.epoch + 1 });
	}, [auth, queryClient, queryKey, userId]);

	const favorites = useQuery({
		queryKey,
		enabled: !isAuthLoading && !authTransitioning && Boolean(auth.userId),
		queryFn: async ({ signal }) => {
			const client = createTrpcClient();
			const cursors = new Set<string>();
			const items: SavedPaper[] = [];
			let cursor: string | undefined;
			do {
				const result = await client.paperFavorites.list.query(
					{ cursor, limit: PAGE_LIMIT },
					{ signal },
				);
				items.push(...result.items);
				if (!result.nextCursor) break;
				if (cursors.has(result.nextCursor)) {
					throw new Error("Favorites pagination repeated a cursor");
				}
				cursors.add(result.nextCursor);
				cursor = result.nextCursor;
			} while (cursor);
			return items;
		},
		retry: false,
	});

	const mutation = useMutation({
		mutationKey: MUTATION_KEY,
		mutationFn: async ({ paper, remove }: MutationVariables) => {
			const client = createTrpcClient();
			if (remove) {
				await client.paperFavorites.remove.mutate({ arxivId: paper.arxivId });
			} else {
				await client.paperFavorites.add.mutate({ arxivId: paper.arxivId });
			}
		},
		onMutate: async (variables) => {
			await queryClient.cancelQueries({ queryKey, exact: true });
			const current = queryClient.getQueryData<FavoritesData>(queryKey);
			const prior = findPriorPaper(current, variables.paper.arxivId);
			queryClient.setQueryData<FavoritesData>(queryKey, (cached) => {
				const data = cached ?? [];
				return variables.remove
					? withoutPaper(data, variables.paper.arxivId)
					: addPaper(data, {
							...variables.paper,
							savedAt: new Date().toISOString(),
						});
			});
			return { prior };
		},
		onError: (_error, variables, context) => {
			if (variables.epoch !== auth.epoch || authTransitioning) return;
			queryClient.setQueryData<FavoritesData>(queryKey, (current) =>
				rollbackPaper(current, context?.prior ?? null, variables.paper.arxivId),
			);
			setMutationError(
				"Could not update favorite. Refresh saved favorites, then use the star to try again.",
			);
		},
	});

	const clearMutation = useMutation({
		mutationKey: CLEAR_MUTATION_KEY,
		mutationFn: async ({ epoch }: { epoch: number }) => {
			if (epoch !== auth.epoch) return;
			await createTrpcClient().paperFavorites.clear.mutate();
		},
		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey, exact: true });
			const previous = queryClient.getQueryData<FavoritesData>(queryKey) ?? [];
			queryClient.setQueryData<FavoritesData>(queryKey, []);
			return { previous };
		},
		onError: (_error, variables, context) => {
			if (variables.epoch !== auth.epoch || authTransitioning) return;
			queryClient.setQueryData<FavoritesData>(
				queryKey,
				context?.previous ?? [],
			);
			setMutationError(
				"Could not clear favorites. Refresh saved favorites, then try again.",
			);
		},
	});

	const mutationStates = useMutationState({
		filters: { mutationKey: MUTATION_KEY },
	});
	const pending = useMemo(
		() =>
			new Set(
				mutationStates.flatMap((state) => {
					const variables = state.variables as MutationVariables | undefined;
					return state.status === "pending" && variables
						? [variables.paper.arxivId]
						: [];
				}),
			),
		[mutationStates],
	);
	const savedPapers = favorites.data ?? [];
	const favoriteIds = useMemo(
		() => new Set(savedPapers.map((paper) => paper.arxivId)),
		[savedPapers],
	);

	function refresh() {
		setMutationError(null);
		void queryClient.resetQueries({ queryKey, exact: true });
	}

	function toggleFavorite(paper: PaperFeedPaper | SavedPaper) {
		if (
			!auth.userId ||
			authTransitioning ||
			clearMutation.isPending ||
			pending.has(paper.arxivId)
		)
			return;
		setMutationError(null);
		mutation.mutate({
			paper,
			remove: favoriteIds.has(paper.arxivId),
			epoch: auth.epoch,
		});
	}

	function clearAll() {
		if (
			!auth.userId ||
			authTransitioning ||
			clearMutation.isPending ||
			pending.size > 0 ||
			savedPapers.length === 0
		)
			return;
		setMutationError(null);
		clearMutation.mutate({ epoch: auth.epoch });
	}

	return {
		count: savedPapers.length,
		savedPapers,
		canFavorite: Boolean(auth.userId) && !authTransitioning,
		canClear:
			Boolean(auth.userId) &&
			!authTransitioning &&
			!clearMutation.isPending &&
			pending.size === 0 &&
			savedPapers.length > 0,
		clearAll,
		error: favorites.error
			? "Could not load favorites. Try again."
			: mutationError,
		isFavorited: (arxivId) => favoriteIds.has(arxivId),
		isPending: (arxivId) => pending.has(arxivId),
		isClearPending: clearMutation.isPending,
		isLoading: favorites.isLoading,
		refresh,
		toggleFavorite,
	};
}
