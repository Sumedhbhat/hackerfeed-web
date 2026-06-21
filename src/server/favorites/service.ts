import "@tanstack/react-start/server-only";

import type { HackerNewsStoryRecord } from "#/lib/hacker-news/queries";
import {
	type AuthenticatedWorkosUser,
	resolveCurrentWorkosUser,
} from "../auth/current-user";
import type { DatabaseContext } from "../database/client";
import { createUserServiceFromDatabase } from "../users/service";
import { createFavoriteRepository } from "./repository";

type CurrentUserInput = Parameters<typeof resolveCurrentWorkosUser>[0];
type FavoriteServiceRepository<TFavorite, TListedFavorites> = {
	upsertStoryFromHackerNews(
		story: HackerNewsStoryRecord,
	): PromiseLike<{ id: string }>;
	createStoryFromHackerNewsIfMissing(
		story: HackerNewsStoryRecord,
	): PromiseLike<{ id: string }>;
	createFavoriteIfMissing(
		appUserId: string,
		storyId: string,
	): PromiseLike<TFavorite>;
	removeFavorite(appUserId: string, hnStoryId: number): PromiseLike<unknown>;
	clearFavorites(appUserId: string): PromiseLike<unknown>;
	listFavorites(appUserId: string): PromiseLike<TListedFavorites>;
};

type UserServiceDependency = {
	getOrCreateAppUser(
		identity: AuthenticatedWorkosUser,
	): PromiseLike<{ id: string }>;
};

type FavoriteServiceMethods<TFavorite, TListedFavorites> = {
	listFavorites(user: CurrentUserInput): Promise<TListedFavorites>;
	addFavorite(
		user: CurrentUserInput,
		story: HackerNewsStoryRecord,
	): Promise<TFavorite>;
	importLocalFavorites(
		user: CurrentUserInput,
		stories: HackerNewsStoryRecord[],
	): Promise<TFavorite[]>;
	removeFavorite(user: CurrentUserInput, hnStoryId: number): Promise<void>;
	clearFavorites(user: CurrentUserInput): Promise<void>;
};

export function createFavoriteService<TFavorite, TListedFavorites>(
	favorites: FavoriteServiceRepository<TFavorite, TListedFavorites>,
	users: UserServiceDependency,
): FavoriteServiceMethods<TFavorite, TListedFavorites>;
export function createFavoriteService<TFavorite, TListedFavorites>(
	favorites: FavoriteServiceRepository<TFavorite, TListedFavorites>,
	users: UserServiceDependency,
): FavoriteServiceMethods<TFavorite, TListedFavorites> {
	async function getAppUser(user: CurrentUserInput) {
		const identity: AuthenticatedWorkosUser = resolveCurrentWorkosUser(user);

		return users.getOrCreateAppUser(identity);
	}

	return {
		async listFavorites(user: CurrentUserInput) {
			const appUser = await getAppUser(user);

			return favorites.listFavorites(appUser.id);
		},

		async addFavorite(user: CurrentUserInput, story: HackerNewsStoryRecord) {
			const appUser = await getAppUser(user);
			const sharedStory = await favorites.upsertStoryFromHackerNews(story);

			return favorites.createFavoriteIfMissing(appUser.id, sharedStory.id);
		},

		async importLocalFavorites(
			user: CurrentUserInput,
			stories: HackerNewsStoryRecord[],
		) {
			const appUser = await getAppUser(user);
			const importedFavorites: TFavorite[] = [];

			for (const story of stories) {
				const sharedStory =
					await favorites.createStoryFromHackerNewsIfMissing(story);
				importedFavorites.push(
					await favorites.createFavoriteIfMissing(appUser.id, sharedStory.id),
				);
			}

			return importedFavorites;
		},

		async removeFavorite(user: CurrentUserInput, hnStoryId: number) {
			const appUser = await getAppUser(user);

			await favorites.removeFavorite(appUser.id, hnStoryId);
		},

		async clearFavorites(user: CurrentUserInput) {
			const appUser = await getAppUser(user);

			await favorites.clearFavorites(appUser.id);
		},
	};
}

export function createFavoriteServiceFromDatabase(database: DatabaseContext) {
	return createFavoriteService(
		createFavoriteRepository(database),
		createUserServiceFromDatabase(database),
	);
}

export type FavoriteService = ReturnType<typeof createFavoriteService>;
