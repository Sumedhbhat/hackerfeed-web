import type { activityEvents } from "#/server/database/schema";
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
	({ storyId: string; paperId?: never } | { paperId: string; storyId?: never });

const events: EventFields[] = [
	...storyRows.map((story, index) => ({
		action: "story.read" as const,
		storyId: story.id,
		occurredAt: sqliteAt(`0${index + 1}:15:00`),
	})),
	...[sparseAttention, reasoningBenchmark, smallModels, diffusionFixtures].map(
		(paper, index) => ({
			action: "paper.read" as const,
			paperId: paper.id,
			occurredAt: sqliteAt(`0${index + 1}:40:00`),
		}),
	),
	...favoriteRows.map((favorite) => ({
		action: "story.favorited" as const,
		storyId: favorite.storyId,
		occurredAt: favorite.createdAt,
	})),
	...paperFavoriteRows.map((favorite) => ({
		action: "paper.favorited" as const,
		paperId: favorite.paperId,
		occurredAt: favorite.createdAt,
	})),
];

export const activityEventRows: ActivityEvent[] = events
	.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
	.map((event, index) => ({
		id: index + 1,
		appUserId: demoUser.id,
		storyId: event.storyId ?? null,
		paperId: event.paperId ?? null,
		action: event.action,
		occurredAt: event.occurredAt,
		lastUpdatedDate: event.occurredAt,
		lastUpdatedBy: demoUser.id,
	}));
