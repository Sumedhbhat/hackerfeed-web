import "@tanstack/react-start/server-only";

import { and, inArray, max, type SQL } from "drizzle-orm";
import { readerActivityEvents } from "../activity/events";
import type { DatabaseContext } from "../database/client";
import { storyViewedActions } from "../database/schema";

/** One row per story the reader has opened: `storyId` and the latest `lastViewedAt`. */
export function lastStoryViews(
	database: DatabaseContext,
	appUserId: string,
	where?: (events: ReturnType<typeof readerActivityEvents>) => SQL,
) {
	const events = readerActivityEvents(database, appUserId);
	return database
		.with(events)
		.select({
			storyId: events.storyId,
			lastViewedAt: max(events.occurredAt).as("lastViewedAt"),
		})
		.from(events)
		.where(and(inArray(events.action, storyViewedActions), where?.(events)))
		.groupBy(events.storyId)
		.as("last_story_views");
}

export function parseActivityTimestamp(value: string): Date {
	return new Date(`${value.replace(" ", "T")}Z`);
}
