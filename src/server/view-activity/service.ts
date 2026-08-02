import "@tanstack/react-start/server-only";

import type { HackerNewsStoryRecord } from "#/lib/hacker-news/queries";
import {
	type AuthenticatedWorkosUser,
	resolveCurrentWorkosUser,
} from "#/server/auth/current-user";
import type { DatabaseContext } from "#/server/database/client";
import { createUserServiceFromDatabase } from "#/server/users/service";
import { createViewActivityRepository } from "./repository";

type CurrentUserInput = Parameters<typeof resolveCurrentWorkosUser>[0];

type ViewActivityRepositoryDependency = {
	recordStoryView(
		appUserId: string,
		story: HackerNewsStoryRecord,
	): PromiseLike<void>;
	findPaperByArxivId(arxivId: string): PromiseLike<{ id: string } | null>;
	recordPaperView(appUserId: string, paperId: string): PromiseLike<void>;
};

type UserServiceDependency = {
	getOrCreateAppUser(
		identity: AuthenticatedWorkosUser,
	): PromiseLike<{ id: string }>;
};

export class ViewedPaperNotFoundError extends Error {
	constructor(arxivId: string) {
		super(`Paper ${arxivId} was not found`);
		this.name = "ViewedPaperNotFoundError";
	}
}

export function createViewActivityService(
	views: ViewActivityRepositoryDependency,
	users: UserServiceDependency,
) {
	async function getAppUser(user: CurrentUserInput) {
		const identity = resolveCurrentWorkosUser(user);
		return users.getOrCreateAppUser(identity);
	}

	return {
		async recordStoryView(
			user: CurrentUserInput,
			story: HackerNewsStoryRecord,
		): Promise<void> {
			const appUser = await getAppUser(user);
			await views.recordStoryView(appUser.id, story);
		},

		async recordPaperView(
			user: CurrentUserInput,
			arxivId: string,
		): Promise<void> {
			const appUser = await getAppUser(user);
			const paper = await views.findPaperByArxivId(arxivId);
			if (!paper) throw new ViewedPaperNotFoundError(arxivId);

			await views.recordPaperView(appUser.id, paper.id);
		},
	};
}

export function createViewActivityServiceFromDatabase(
	database: DatabaseContext,
) {
	return createViewActivityService(
		createViewActivityRepository(database),
		createUserServiceFromDatabase(database),
	);
}

export type ViewActivityService = ReturnType<typeof createViewActivityService>;
