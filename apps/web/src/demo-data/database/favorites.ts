import type { favorites, stories } from "#/server/database/schema";
import { sqliteAt } from "../defaults";
import { demoUser } from "./app-users";
import { buildCache, sideProjects, tinySpreadsheet } from "./stories";

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

export const favoriteRows: Favorite[] = [
	favorite(tinySpreadsheet, { createdAt: sqliteAt("10:30:00") }),
	favorite(buildCache, { createdAt: sqliteAt("11:30:00") }),
	favorite(sideProjects, { createdAt: sqliteAt("12:30:00") }),
];
