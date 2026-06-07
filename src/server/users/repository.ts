import "@tanstack/react-start/server-only";

import { type DatabaseClient, db } from "../database/client";

export function createUserRepository(database: DatabaseClient = db) {
	return {
		getOrCreateByWorkosUserId(workosUserId: string) {
			return database.appUser.upsert({
				where: { workosUserId },
				update: {},
				create: { workosUserId },
			});
		},
	};
}

export type UserRepository = ReturnType<typeof createUserRepository>;
