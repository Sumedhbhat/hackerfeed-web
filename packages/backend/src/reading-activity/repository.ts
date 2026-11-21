import "@tanstack/react-start/server-only";

import type { ReadingDay } from "@hackerfeed/entities/analytics";
import { inArray, sql } from "drizzle-orm";
import { readerActivityEvents } from "../activity/events";
import type { DatabaseContext } from "../database/client";
import { storyViewedActions } from "../database/schema";

const paperReadActions = ["paper.read"] as const;

export function createReadingActivityRepository(database: DatabaseContext) {
	return {
		async listReadingDays(
			appUserId: string,
			utcOffsetMinutes: number,
		): Promise<ReadingDay[]> {
			const events = readerActivityEvents(database, appUserId);
			const date = sql<string>`date(${events.occurredAt}, ${`${utcOffsetMinutes} minutes`})`;

			return database
				.with(events)
				.select({
					date,
					stories: sql<number>`count(distinct case when ${inArray(events.action, storyViewedActions)} then ${events.storyId} end)`,
					papers: sql<number>`count(distinct case when ${inArray(events.action, paperReadActions)} then ${events.paperId} end)`,
				})
				.from(events)
				.where(
					inArray(events.action, [...storyViewedActions, ...paperReadActions]),
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
