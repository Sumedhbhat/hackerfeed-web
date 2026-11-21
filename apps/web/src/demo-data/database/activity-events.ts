import type {
	activityEvents,
	hfPapers,
	stories,
} from "@hackerfeed/backend/database/schema";
import { DEMO_DATE, sqliteAt } from "../defaults";
import { demoUser } from "./app-users";
import { favoriteRows } from "./favorites";
import { paperFavoriteRows } from "./paper-favorites";
import { paperRows } from "./papers";
import { storyRows } from "./stories";

type ActivityEvent = typeof activityEvents.$inferSelect;
type EventFields = Pick<ActivityEvent, "action" | "occurredAt"> &
	Partial<ActivityEvent>;

const activityEvent = (fields: EventFields): Omit<ActivityEvent, "id"> => {
	const appUserId = fields.appUserId ?? demoUser.id;
	return {
		appUserId,
		storyId: null,
		paperId: null,
		lastUpdatedDate: fields.occurredAt,
		lastUpdatedBy: appUserId,
		...fields,
	};
};

export const storyEvent = (
	story: typeof stories.$inferSelect,
	fields: EventFields,
) => activityEvent({ storyId: story.id, ...fields });

export const paperEvent = (
	paper: typeof hfPapers.$inferSelect,
	fields: EventFields,
) => activityEvent({ paperId: paper.id, ...fields });

const HISTORY_DAYS = 100;

/** `time` on the day `daysAgo` before the demo day, in SQLite's format. */
const sqliteDaysBefore = (daysAgo: number, time: string) => {
	const date = new Date(`${DEMO_DATE}T00:00:00Z`);
	date.setUTCDate(date.getUTCDate() - daysAgo);
	return `${date.toISOString().slice(0, 10)} ${time}`;
};

/**
 * Earlier reading, so analytics has a history: every day for the last two and
 * a half weeks (a streak), then most days, with a four-day break.
 */
const readingHistory = Array.from({ length: HISTORY_DAYS }, (_, index) => {
	const daysAgo = index + 1;
	const skipped =
		(daysAgo > 17 && daysAgo % 6 === 0) || (daysAgo >= 45 && daysAgo <= 48);
	if (skipped) return [];
	const storyCount = 1 + ((daysAgo * 7) % 5);
	const paperCount = daysAgo % 3 === 0 ? 1 + (daysAgo % 2) : 0;
	return [
		...storyRows.slice(0, storyCount).map((story, position) =>
			storyEvent(story, {
				action: "story.read",
				occurredAt: sqliteDaysBefore(daysAgo, `1${position}:05:00`),
			}),
		),
		...paperRows.slice(0, paperCount).map((paper, position) =>
			paperEvent(paper, {
				action: "paper.read",
				occurredAt: sqliteDaysBefore(daysAgo, `1${position}:45:00`),
			}),
		),
	];
}).flat();

const events = [
	...readingHistory,
	...storyRows.map((story, index) =>
		storyEvent(story, {
			action: "story.read",
			occurredAt: sqliteAt(`0${index + 1}:15:00`),
		}),
	),
	...paperRows.slice(0, 4).map((paper, index) =>
		paperEvent(paper, {
			action: "paper.read",
			occurredAt: sqliteAt(`0${index + 1}:40:00`),
		}),
	),
	...favoriteRows.map((favorite) =>
		activityEvent({
			action: "story.favorited",
			storyId: favorite.storyId,
			occurredAt: favorite.createdAt,
		}),
	),
	...paperFavoriteRows.map((favorite) =>
		activityEvent({
			action: "paper.favorited",
			paperId: favorite.paperId,
			occurredAt: favorite.createdAt,
		}),
	),
];

export const activityEventRows: ActivityEvent[] = events
	.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
	.map((event, index) => ({ id: index + 1, ...event }));
