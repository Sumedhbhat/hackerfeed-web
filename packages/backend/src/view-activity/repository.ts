import "@tanstack/react-start/server-only";

import type { HackerNewsStoryRecord } from "@hackerfeed/entities/hacker-news";
import type {
	PaperViewAction,
	StoryViewAction,
} from "@hackerfeed/entities/view-activity";
import { eq, inArray, sql } from "drizzle-orm";
import type { DatabaseContext } from "../database/client";
import { activityEvents, hfPapers, stories } from "../database/schema";
import { mapHackerNewsStory } from "../stories/persistence";
import { lastStoryViews, parseActivityTimestamp } from "./last-viewed";

export function createViewActivityRepository(database: DatabaseContext) {
	return {
		async recordStoryView(
			appUserId: string,
			story: HackerNewsStoryRecord,
			action: StoryViewAction,
		): Promise<void> {
			const mappedStory = mapHackerNewsStory(story);
			const upsertStory = database
				.insert(stories)
				.values(mappedStory)
				.onConflictDoUpdate({
					target: stories.hnStoryId,
					set: mappedStory,
				});
			const insertView = database.insert(activityEvents).values({
				appUserId,
				action: `story.${action}`,
				storyId: sql`(select ${stories.id} from ${stories} where ${stories.hnStoryId} = ${story.id})`,
				lastUpdatedBy: appUserId,
			});

			await database.batch([upsertStory, insertView]);
		},

		async listStoriesLastViewed(appUserId: string, hnStoryIds: number[]) {
			if (hnStoryIds.length === 0) return [];

			const lastViews = lastStoryViews(
				database,
				appUserId,
				inArray(
					activityEvents.storyId,
					database
						.select({ id: stories.id })
						.from(stories)
						.where(inArray(stories.hnStoryId, hnStoryIds)),
				),
			);
			const rows = await database
				.select({
					hnStoryId: stories.hnStoryId,
					lastViewedAt: lastViews.lastViewedAt,
				})
				.from(stories)
				.innerJoin(lastViews, eq(lastViews.storyId, stories.id))
				.all();

			return rows.flatMap(({ hnStoryId, lastViewedAt }) =>
				lastViewedAt
					? [{ hnStoryId, lastViewedAt: parseActivityTimestamp(lastViewedAt) }]
					: [],
			);
		},

		async findPaperByArxivId(arxivId: string) {
			const [paper] = await database
				.select({ id: hfPapers.id })
				.from(hfPapers)
				.where(eq(hfPapers.arxivId, arxivId))
				.limit(1);

			return paper ?? null;
		},

		async recordPaperView(
			appUserId: string,
			paperId: string,
			action: PaperViewAction,
		): Promise<void> {
			await database
				.insert(activityEvents)
				.values({
					appUserId,
					action: `paper.${action}`,
					paperId,
					lastUpdatedBy: appUserId,
				})
				.run();
		},
	};
}

export type ViewActivityRepository = ReturnType<
	typeof createViewActivityRepository
>;
