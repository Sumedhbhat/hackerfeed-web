import type { favorites, stories } from "@hackerfeed/backend/database/schema";
import { sqliteAt } from "../defaults";
import { demoUser } from "./app-users";
import { storyRows } from "./stories";

type Favorite = typeof favorites.$inferSelect;

export const favorite = (
	story: typeof stories.$inferSelect,
	fields: Pick<Favorite, "createdAt"> & Partial<Favorite>,
): Favorite => ({
	id: `${story.id}-favorite`,
	appUserId: demoUser.id,
	storyId: story.id,
	...fields,
});

export const favoriteRows: Favorite[] = storyRows
	.slice(0, 3)
	.map((story, index) =>
		favorite(story, { createdAt: sqliteAt(`1${index}:30:00`) }),
	);
