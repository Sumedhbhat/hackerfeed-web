import "@tanstack/react-start/server-only";

import {
	createReadingDateFormatter,
	type ReadingDay,
} from "@hackerfeed/entities/analytics";
import { and, inArray, sql } from "drizzle-orm";
import { readerActivityEvents } from "../activity/events";
import type { DatabaseContext } from "../database/client";
import { storyViewedActions } from "../database/schema";
import { parseActivityTimestamp } from "../view-activity/last-viewed";

const readingActions = [...storyViewedActions, "paper.read"] as const;
const pageSize = 1000;

export function createReadingActivityRepository(database: DatabaseContext) {
	return {
		async listReadingDays(
			appUserId: string,
			timeZone: string,
		): Promise<ReadingDay[]> {
			const events = readerActivityEvents(database, appUserId);
			const formatDate = createReadingDateFormatter(timeZone);
			const days = new Map<
				string,
				{ stories: Set<string>; papers: Set<string> }
			>();
			let cursor: { occurredAt: string; id: number } | undefined;

			// Fetch bounded batches while grouping by the offset in effect at each read.
			for (;;) {
				const rows = await database
					.with(events)
					.select({
						id: events.id,
						occurredAt: events.occurredAt,
						storyId: events.storyId,
						paperId: events.paperId,
					})
					.from(events)
					.where(
						and(
							inArray(events.action, readingActions),
							cursor &&
								sql`(${events.occurredAt}, ${events.id}) > (${cursor.occurredAt}, ${cursor.id})`,
						),
					)
					.orderBy(events.occurredAt, events.id)
					.limit(pageSize)
					.all();

				for (const { occurredAt, storyId, paperId } of rows) {
					const date = formatDate(parseActivityTimestamp(occurredAt).getTime());
					const day = days.get(date) ?? {
						stories: new Set<string>(),
						papers: new Set<string>(),
					};
					if (storyId !== null) day.stories.add(storyId);
					if (paperId !== null) day.papers.add(paperId);
					days.set(date, day);
				}

				if (rows.length < pageSize) break;
				cursor = rows.at(-1);
			}

			return [...days]
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([date, { stories, papers }]) => ({
					date,
					stories: stories.size,
					papers: papers.size,
				}));
		},
	};
}

export type ReadingActivityRepository = ReturnType<
	typeof createReadingActivityRepository
>;
