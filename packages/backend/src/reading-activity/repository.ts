import "@tanstack/react-start/server-only";

import type { ReadingDay } from "@hackerfeed/entities/analytics";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { DatabaseContext } from "../database/client";
import { activityEvents, storyViewedActions } from "../database/schema";

const paperReadActions = ["paper.read"] as const;

export function createReadingActivityRepository(database: DatabaseContext) {
	return {
		async listReadingDays(
			appUserId: string,
			utcOffsetMinutes: number,
		): Promise<ReadingDay[]> {
			const date = sql<string>`date(${activityEvents.occurredAt}, ${`${utcOffsetMinutes} minutes`})`;

			return database
				.select({
					date,
					stories: sql<number>`count(distinct case when ${inArray(activityEvents.action, storyViewedActions)} then ${activityEvents.storyId} end)`,
					papers: sql<number>`count(distinct case when ${inArray(activityEvents.action, paperReadActions)} then ${activityEvents.paperId} end)`,
				})
				.from(activityEvents)
				.where(
					and(
						eq(activityEvents.appUserId, appUserId),
						inArray(activityEvents.action, [
							...storyViewedActions,
							...paperReadActions,
						]),
					),
				)
				.groupBy(date)
				.orderBy(date)
				.all();
		},
	};
}

export type ReadingActivityRepository = ReturnType<
	typeof createReadingActivityRepository
>;
