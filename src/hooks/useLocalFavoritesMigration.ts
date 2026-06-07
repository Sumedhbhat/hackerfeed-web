import { useEffect, useRef } from "react";
import {
	hasCompletedLocalFavoritesMigration,
	markLocalFavoritesMigrationCompleted,
} from "#/lib/favorites/local-migration";
import { hackerNewsStorySchema } from "#/lib/favorites/schemas";
import { getFavorites } from "#/lib/favorites-store";
import type { HackerNewsStoryRecord } from "#/lib/hacker-news/queries";
import { logger } from "#/lib/logger";
import { createTrpcClient } from "#/lib/trpc/client";
import { useAuthSession } from "./useAuthSession";

export function getMigratableLocalFavorites(): HackerNewsStoryRecord[] {
	return getFavorites().filter((story): story is HackerNewsStoryRecord => {
		return hackerNewsStorySchema.safeParse(story).success;
	});
}

export function useLocalFavoritesMigration(): void {
	const { isLoading, user } = useAuthSession();
	const inFlightUserId = useRef<string | null>(null);
	const workosUserId = user?.id;

	useEffect(() => {
		if (
			isLoading ||
			!workosUserId ||
			inFlightUserId.current === workosUserId ||
			hasCompletedLocalFavoritesMigration(workosUserId)
		) {
			return;
		}

		const migrationWorkosUserId = workosUserId;
		inFlightUserId.current = migrationWorkosUserId;

		async function migrateLocalFavorites() {
			try {
				const stories = getMigratableLocalFavorites();

				if (stories.length > 0) {
					await createTrpcClient().favorites.importLocal.mutate({
						stories,
					});
				}

				markLocalFavoritesMigrationCompleted(migrationWorkosUserId);
			} catch (error) {
				logger.error("Local favorites migration failed", {
					err: error instanceof Error ? error.message : String(error),
					workosUserId: migrationWorkosUserId,
				});
			} finally {
				if (inFlightUserId.current === migrationWorkosUserId) {
					inFlightUserId.current = null;
				}
			}
		}

		void migrateLocalFavorites();
	}, [isLoading, workosUserId]);
}
