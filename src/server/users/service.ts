import "@tanstack/react-start/server-only";

import type { AuthenticatedWorkosUser } from "../auth/current-user";
import type { DatabaseContext } from "../database/client";
import { createUserRepository, type UserRepository } from "./repository";

export function createUserService(users: UserRepository) {
	return {
		getOrCreateAppUser(identity: AuthenticatedWorkosUser) {
			return users.getOrCreateByWorkosUserId(identity.workosUserId);
		},
	};
}

export function createUserServiceFromDatabase(database: DatabaseContext) {
	return createUserService(createUserRepository(database));
}

export type UserService = ReturnType<typeof createUserService>;
