import type {
	activityEvents,
	hfPapers,
	stories,
} from "#/server/database/schema";
import { sqliteAt } from "../defaults";
import { demoUser } from "./app-users";
import { favoriteRows } from "./favorites";
import { paperFavoriteRows } from "./paper-favorites";
import {
	diffusionFixtures,
	reasoningBenchmark,
	smallModels,
	sparseAttention,
} from "./papers";
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

const events = [
	...storyRows.map((story, index) =>
		storyEvent(story, {
			action: "story.read",
			occurredAt: sqliteAt(`0${index + 1}:15:00`),
		}),
	),
	...[sparseAttention, reasoningBenchmark, smallModels, diffusionFixtures].map(
		(paper, index) =>
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
