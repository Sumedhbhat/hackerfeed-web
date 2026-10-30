import { hackerNewsStorySchema } from "@hackerfeed/contracts/favorites";
import type { HackerNewsStoryRecord } from "@hackerfeed/hacker-news/records";
import { useEffect, useRef } from "react";
import { reportError } from "#/lib/errors/report-error";
import {
	hasCompletedLocalFavoritesMigration,
	markLocalFavoritesMigrationCompleted,
} from "#/lib/favorites/local-migration";
import { getFavorites } from "#/lib/favorites-store";
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
				reportError("Local favorites migration failed", error, {
					action: "save",
					message:
						"Sorry, we couldn't move your saved stories to your account. We'll try again next time.",
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
