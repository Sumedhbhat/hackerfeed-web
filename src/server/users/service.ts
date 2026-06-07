import "@tanstack/react-start/server-only";

import type { AuthenticatedWorkosUser } from "../auth/current-user";
import { createUserRepository, type UserRepository } from "./repository";

export function createUserService(
	users: UserRepository = createUserRepository(),
) {
	return {
		getOrCreateAppUser(identity: AuthenticatedWorkosUser) {
			return users.getOrCreateByWorkosUserId(identity.workosUserId);
		},
	};
}

export type UserService = ReturnType<typeof createUserService>;
