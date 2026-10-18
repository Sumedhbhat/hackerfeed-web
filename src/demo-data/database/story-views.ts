import type { stories, storyViews } from "#/server/database/schema";
import { sqliteAt } from "../defaults";
import { demoUser } from "./app-users";
import { storyRows } from "./stories";

type StoryView = typeof storyViews.$inferSelect;

export const storyView = (
	story: typeof stories.$inferSelect,
	fields: Pick<StoryView, "viewedAt"> & Partial<StoryView>,
): StoryView => {
	const appUserId = fields.appUserId ?? demoUser.id;
	return {
		id: `${story.id}-view`,
		appUserId,
		storyId: story.id,
		lastUpdatedDate: fields.viewedAt,
		lastUpdatedBy: appUserId,
		...fields,
	};
};

export const storyViewRows: StoryView[] = storyRows.map((story, index) =>
	storyView(story, { viewedAt: sqliteAt(`0${index + 1}:15:00`) }),
);
