import "@tanstack/react-start/server-only";

import type { ReadingDay } from "@hackerfeed/entities/analytics";
import {
	type AuthenticatedWorkosUser,
	resolveCurrentWorkosUser,
} from "../auth/current-user";
import type { DatabaseContext } from "../database/client";
import { createUserServiceFromDatabase } from "../users/service";
import { createReadingActivityRepository } from "./repository";

type CurrentUserInput = Parameters<typeof resolveCurrentWorkosUser>[0];

type ReadingActivityRepositoryDependency = {
	listReadingDays(
		appUserId: string,
		utcOffsetMinutes: number,
	): PromiseLike<ReadingDay[]>;
};

type UserServiceDependency = {
	getOrCreateAppUser(
		identity: AuthenticatedWorkosUser,
	): PromiseLike<{ id: string }>;
};

export function createReadingActivityService(
	readingActivity: ReadingActivityRepositoryDependency,
	users: UserServiceDependency,
) {
	return {
		async listReadingDays(
			user: CurrentUserInput,
			utcOffsetMinutes: number,
		): Promise<ReadingDay[]> {
			const appUser = await users.getOrCreateAppUser(
				resolveCurrentWorkosUser(user),
			);
			return readingActivity.listReadingDays(appUser.id, utcOffsetMinutes);
		},
	};
}

export function createReadingActivityServiceFromDatabase(
	database: DatabaseContext,
) {
	return createReadingActivityService(
		createReadingActivityRepository(database),
		createUserServiceFromDatabase(database),
	);
}

export type ReadingActivityService = ReturnType<
	typeof createReadingActivityService
>;
