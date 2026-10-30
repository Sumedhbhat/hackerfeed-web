import "@tanstack/react-start/server-only";

import { sql } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import type { ActivityAction } from "#/server/database/schema";

type Subject =
	| { storyId: SQLiteColumn; paperId?: never }
	| { paperId: SQLiteColumn; storyId?: never };

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
