import type { appUsers } from "#/server/database/schema";

type AppUser = typeof appUsers.$inferSelect;

/** Rows owned by this user are copied to everyone who signs in to a preview. */
export const demoUser: AppUser = {
	id: "demo-user",
	workosUserId: "demo-workos-user",
};

export const appUserRows: AppUser[] = [demoUser];
