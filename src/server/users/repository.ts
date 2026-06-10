import "@tanstack/react-start/server-only";

import { type D1DatabaseBinding, getD1Database } from "../database/client";

type AppUserRecord = {
	id: string;
	workosUserId: string;
};

async function getAppUserByWorkosUserId(
	database: D1DatabaseBinding,
	workosUserId: string,
) {
	return database
		.prepare("SELECT id, workosUserId FROM app_users WHERE workosUserId = ?")
		.bind(workosUserId)
		.first<AppUserRecord>();
}

export function createUserRepository(database = getD1Database()) {
	return {
		async getOrCreateByWorkosUserId(workosUserId: string) {
			const existingUser = await getAppUserByWorkosUserId(
				database,
				workosUserId,
			);

			if (existingUser) {
				return existingUser;
			}

			const id = crypto.randomUUID();
			await database
				.prepare(
					"INSERT OR IGNORE INTO app_users (id, workosUserId) VALUES (?, ?)",
				)
				.bind(id, workosUserId)
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
