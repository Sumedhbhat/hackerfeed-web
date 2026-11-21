import "@tanstack/react-start/server-only";

import { eq, sql } from "drizzle-orm";
import type { SQLiteColumn, SQLiteInsertValue } from "drizzle-orm/sqlite-core";
import type { DatabaseContext } from "../database/client";
import { type ActivityAction, activityEvents } from "../database/schema";

type Subject =
	| { storyId: SQLiteColumn; paperId?: never }
	| { paperId: SQLiteColumn; storyId?: never };

/**
 * One reader's activity events. Read activity only through this: it is
 * `activity_events` already filtered to `appUserId`, so a query built on it
 * cannot see another reader's events. Select from it with
 * `database.with(events).select(...).from(events)`.
 */
export function readerActivityEvents(
	database: DatabaseContext,
	appUserId: string,
) {
	return database
		.$with("reader_activity_events")
		.as(
			database
				.select()
				.from(activityEvents)
				.where(eq(activityEvents.appUserId, appUserId)),
		);
}

type ActivityEventValues = Omit<
	SQLiteInsertValue<typeof activityEvents>,
	"id" | "appUserId" | "lastUpdatedBy" | "occurredAt" | "lastUpdatedDate"
>;

/** Records an event as `appUserId`'s own. */
export function insertActivityEvent(
	database: DatabaseContext,
	appUserId: string,
	values: ActivityEventValues,
) {
	return database
		.insert(activityEvents)
		.values({ ...values, appUserId, lastUpdatedBy: appUserId });
}

const insertInto = (database: DatabaseContext) =>
	database.insert(activityEvents);

/** `insert into activity_events select ...`; pick the columns with {@link activityEventSelection}. */
export function insertActivityEventsFrom(
	database: DatabaseContext,
	query: Parameters<ReturnType<typeof insertInto>["select"]>[0],
) {
	return insertInto(database).select(query);
}

/** The columns for {@link insertActivityEventsFrom}, as `appUserId`'s own. */
export function activityEventSelection(
	appUserId: string,
	action: ActivityAction,
	subject: Subject,
) {
	return {
		id: sql<null>`null`.as("id"),
		appUserId: sql<string>`${appUserId}`.as("appUserId"),
		action: sql<ActivityAction>`${action}`.as("action"),
		storyId: subject.storyId ?? sql<null>`null`.as("storyId"),
		paperId: subject.paperId ?? sql<null>`null`.as("paperId"),
		occurredAt: sql<string>`CURRENT_TIMESTAMP`.as("occurredAt"),
		lastUpdatedDate: sql<string>`CURRENT_TIMESTAMP`.as("lastUpdatedDate"),
		lastUpdatedBy: sql<string>`${appUserId}`.as("lastUpdatedBy"),
	};
}
