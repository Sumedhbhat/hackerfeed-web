import "@tanstack/react-start/server-only";

import { eq } from "drizzle-orm";
import type { DatabaseContext } from "../database/client";
import { appUsers } from "../database/schema";

async function getAppUserByWorkosUserId(
	database: DatabaseContext,
	workosUserId: string,
) {
	const [appUser] = await database
		.select()
		.from(appUsers)
		.where(eq(appUsers.workosUserId, workosUserId))
		.limit(1)
		.all();

	return appUser;
}

export function createUserRepository(database: DatabaseContext) {
	return {
		async getOrCreateByWorkosUserId(workosUserId: string) {
			const existingUser = await getAppUserByWorkosUserId(
				database,
				workosUserId,
			);

			if (existingUser) {
				return existingUser;
			}

			await database
				.insert(appUsers)
				.values({ workosUserId })
				.onConflictDoNothing({ target: appUsers.workosUserId })
				.run();

			const appUser = await getAppUserByWorkosUserId(database, workosUserId);
			if (!appUser) {
				throw new Error("D1 app user upsert failed");
			}

			return appUser;
		},
	};
}

export type UserRepository = ReturnType<typeof createUserRepository>;
