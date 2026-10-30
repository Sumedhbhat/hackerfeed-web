import type { appUsers } from "#/server/database/schema";

type AppUser = typeof appUsers.$inferSelect;

/** The fixed demo session owns these fixture rows. */
export const demoUser: AppUser = {
	id: "demo-user",
	workosUserId: "demo-workos-user",
};

export const appUserRows: AppUser[] = [demoUser];
