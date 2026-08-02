import "@tanstack/react-start/server-only";

import { eq, sql } from "drizzle-orm";
import type { HackerNewsStoryRecord } from "#/lib/hacker-news/queries";
import type { DatabaseContext } from "#/server/database/client";
import {
	hfPapers,
	paperViews,
	stories,
	storyViews,
} from "#/server/database/schema";
import { mapHackerNewsStory } from "#/server/stories/persistence";

export function createViewActivityRepository(database: DatabaseContext) {
	return {
		async recordStoryView(
			appUserId: string,
			story: HackerNewsStoryRecord,
		): Promise<void> {
			const mappedStory = mapHackerNewsStory(story);
			const upsertStory = database
				.insert(stories)
				.values(mappedStory)
				.onConflictDoUpdate({
					target: stories.hnStoryId,
					set: mappedStory,
				});
			const insertView = database.insert(storyViews).values({
				appUserId,
				storyId: sql`(select ${stories.id} from ${stories} where ${stories.hnStoryId} = ${story.id})`,
				lastUpdatedBy: appUserId,
			});

			await database.batch([upsertStory, insertView]);
		},

		async findPaperByArxivId(arxivId: string) {
			const [paper] = await database
				.select({ id: hfPapers.id })
				.from(hfPapers)
				.where(eq(hfPapers.arxivId, arxivId))
				.limit(1);

			return paper ?? null;
		},

		async recordPaperView(appUserId: string, paperId: string): Promise<void> {
			await database
				.insert(paperViews)
				.values({
					appUserId,
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
