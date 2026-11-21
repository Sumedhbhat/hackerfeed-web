import "@tanstack/react-start/server-only";

import { and, eq, inArray, max, type SQL } from "drizzle-orm";
import type { DatabaseContext } from "../database/client";
import { activityEvents, storyViewedActions } from "../database/schema";

/** One row per story the reader has opened: `storyId` and the latest `lastViewedAt`. */
export function lastStoryViews(
	database: DatabaseContext,
	appUserId: string,
	where?: SQL,
) {
	return database
		.select({
			storyId: activityEvents.storyId,
			lastViewedAt: max(activityEvents.occurredAt).as("lastViewedAt"),
		})
		.from(activityEvents)
		.where(
			and(
				eq(activityEvents.appUserId, appUserId),
				inArray(activityEvents.action, storyViewedActions),
				where,
			),
		)
		.groupBy(activityEvents.storyId)
		.as("last_story_views");
}

export function parseActivityTimestamp(value: string): Date {
	return new Date(`${value.replace(" ", "T")}Z`);
}
