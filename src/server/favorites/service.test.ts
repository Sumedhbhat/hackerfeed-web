import { describe, expect, it } from "vitest";
import type { HackerNewsStoryRecord } from "#/lib/hacker-news/queries";
import { UnauthorizedError } from "../auth/current-user";
import { createFavoriteService } from "./service";

type AppUserRecord = { id: string; workosUserId: string };

type StoryRecord = {
	id: string;
	hnStoryId: number;
	title: string | null;
	url: string | null;
	text: string | null;
	score: number;
	hnPostedAt: Date | null;
	authorUsername: string | null;
	commentCount: number;
	commentIds: number[];
};

type FavoriteRecord = {
	id: string;
	appUserId: string;
	storyId: string;
	createdAt: Date;
};

function createStory(overrides: Partial<HackerNewsStoryRecord> = {}) {
	return {
		by: "alice",
		descendants: 3,
		id: 123,
		kids: [1, 2],
		score: 42,
		text: null,
		time: 1_700_000_000,
		title: "Original title",
		type: "story",
		url: "https://example.com/original",
		...overrides,
	} satisfies HackerNewsStoryRecord;
}

function createHarness() {
	const appUsers: AppUserRecord[] = [];
	const stories: StoryRecord[] = [];
	const favorites: FavoriteRecord[] = [];
	let nextUserId = 1;
	let nextStoryId = 1;
	let nextFavoriteId = 1;
	let nextCreatedAt = Date.UTC(2024, 0, 1);

	const users = {
		async getOrCreateAppUser(identity: { workosUserId: string }) {
			let appUser = appUsers.find(
				(user) => user.workosUserId === identity.workosUserId,
			);

			if (!appUser) {
				appUser = {
					id: `user-${nextUserId}`,
					workosUserId: identity.workosUserId,
				};
				nextUserId += 1;
				appUsers.push(appUser);
			}

			return appUser;
		},
	};

	const repository = {
		async upsertStoryFromHackerNews(story: HackerNewsStoryRecord) {
			const incomingStory = {
				hnStoryId: story.id,
				title: story.title,
				url: story.url,
				text: story.text,
				score: story.score,
				hnPostedAt: story.time ? new Date(story.time * 1000) : null,
				authorUsername: story.by,
				commentCount: story.descendants,
				commentIds: story.kids,
			};

			let sharedStory = stories.find(
				(existingStory) => existingStory.hnStoryId === story.id,
			);

			if (!sharedStory) {
				sharedStory = { id: `story-${nextStoryId}`, ...incomingStory };
				nextStoryId += 1;
				stories.push(sharedStory);
				return sharedStory;
			}

			Object.assign(sharedStory, incomingStory);
			return sharedStory;
		},

		async createStoryFromHackerNewsIfMissing(story: HackerNewsStoryRecord) {
			let sharedStory = stories.find(
				(existingStory) => existingStory.hnStoryId === story.id,
			);

			if (!sharedStory) {
				sharedStory = {
					id: `story-${nextStoryId}`,
					hnStoryId: story.id,
					title: story.title,
					url: story.url,
					text: story.text,
					score: story.score,
					hnPostedAt: story.time ? new Date(story.time * 1000) : null,
					authorUsername: story.by,
					commentCount: story.descendants,
					commentIds: story.kids,
				};
				nextStoryId += 1;
				stories.push(sharedStory);
			}

			return sharedStory;
		},

		async createFavoriteIfMissing(appUserId: string, storyId: string) {
			let favorite = favorites.find(
				(existingFavorite) =>
					existingFavorite.appUserId === appUserId &&
					existingFavorite.storyId === storyId,
			);

			if (!favorite) {
				favorite = {
					id: `favorite-${nextFavoriteId}`,
					appUserId,
					storyId,
					createdAt: new Date(nextCreatedAt),
				};
				nextFavoriteId += 1;
				nextCreatedAt += 1_000;
				favorites.push(favorite);
			}

			return favorite;
		},

		async removeFavorite(appUserId: string, hnStoryId: number) {
			const story = stories.find(
				(existingStory) => existingStory.hnStoryId === hnStoryId,
			);
			const favoriteIndex = story
				? favorites.findIndex(
						(favorite) =>
							favorite.appUserId === appUserId && favorite.storyId === story.id,
					)
				: -1;

			if (favoriteIndex >= 0) {
				favorites.splice(favoriteIndex, 1);
			}
		},

		async clearFavorites(appUserId: string) {
			for (let index = favorites.length - 1; index >= 0; index -= 1) {
				if (favorites[index]?.appUserId === appUserId) {
					favorites.splice(index, 1);
				}
			}
		},

		async listFavorites(appUserId: string) {
			return favorites
				.filter((favorite) => favorite.appUserId === appUserId)
				.map((favorite) => {
					const story = stories.find(
						(existingStory) => existingStory.id === favorite.storyId,
					);

					if (!story) {
						throw new Error("Favorite story missing from harness");
					}

					return { ...favorite, story };
				})
				.sort(
					(left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
				);
		},
	};

	return {
		appUsers,
		favorites,
		repository,
		service: createFavoriteService(repository, users),
		stories,
	};
}

describe("favorite service", () => {
	it("authenticates and creates the app user, shared story, and favorite", async () => {
		const { appUsers, favorites, service, stories } = createHarness();

		await service.addFavorite({ workosUserId: "workos-user-1" }, createStory());

		expect(appUsers).toEqual([{ id: "user-1", workosUserId: "workos-user-1" }]);
		expect(stories).toHaveLength(1);
		expect(stories[0]?.hnStoryId).toBe(123);
		expect(favorites).toHaveLength(1);
		expect(favorites[0]).toMatchObject({
			appUserId: "user-1",
			storyId: "story-1",
		});
	});

	it("rejects adding a favorite without an authenticated user", async () => {
		const { service } = createHarness();

		await expect(
			service.addFavorite(null, createStory()),
		).rejects.toBeInstanceOf(UnauthorizedError);
	});

	it("is idempotent when adding the same favorite more than once", async () => {
		const { favorites, service, stories } = createHarness();

		const firstFavorite = await service.addFavorite(
			{ workosUserId: "workos-user-1" },
			createStory(),
		);
		const secondFavorite = await service.addFavorite(
			{ workosUserId: "workos-user-1" },
			createStory(),
		);

		expect(secondFavorite).toBe(firstFavorite);
		expect(stories).toHaveLength(1);
		expect(favorites).toHaveLength(1);
	});

	it("refreshes mutable shared story fields while preserving the favorite", async () => {
		const { favorites, service, stories } = createHarness();

		await service.addFavorite({ workosUserId: "workos-user-1" }, createStory());
		await service.addFavorite(
			{ workosUserId: "workos-user-1" },
			createStory({
				by: "bob",
				descendants: 9,
				kids: [8, 7, 6],
				score: 100,
				time: 1_700_001_000,
				title: "Updated title",
				url: "https://example.com/updated",
			}),
		);

		expect(stories).toHaveLength(1);
		expect(stories[0]).toMatchObject({
			authorUsername: "bob",
			commentCount: 9,
			commentIds: [8, 7, 6],
			score: 100,
			title: "Updated title",
			url: "https://example.com/updated",
		});
		expect(stories[0]?.hnPostedAt?.toISOString()).toBe(
			"2023-11-14T22:30:00.000Z",
		);
		expect(favorites).toHaveLength(1);
	});

	it("safely removes present and missing favorites", async () => {
		const { favorites, service } = createHarness();

		await service.addFavorite({ workosUserId: "workos-user-1" }, createStory());
		await service.removeFavorite({ workosUserId: "workos-user-1" }, 123);
		await service.removeFavorite({ workosUserId: "workos-user-1" }, 123);
		await service.removeFavorite({ workosUserId: "workos-user-1" }, 999);

		expect(favorites).toHaveLength(0);
	});

	it("clears only the current user's active favorites", async () => {
		const { favorites, service } = createHarness();

		await service.addFavorite({ workosUserId: "workos-user-1" }, createStory());
		await service.addFavorite(
			{ workosUserId: "workos-user-2" },
			createStory({ id: 456 }),
		);
		await service.clearFavorites({ workosUserId: "workos-user-1" });

		expect(favorites).toHaveLength(1);
		expect(favorites[0]?.appUserId).toBe("user-2");
	});

	it("creates a new current favorite row when refavoriting after removal", async () => {
		const { favorites, service } = createHarness();

		const firstFavorite = await service.addFavorite(
			{ workosUserId: "workos-user-1" },
			createStory(),
		);
		await service.removeFavorite({ workosUserId: "workos-user-1" }, 123);
		const secondFavorite = await service.addFavorite(
			{ workosUserId: "workos-user-1" },
			createStory(),
		);

		expect(favorites).toHaveLength(1);
		expect(secondFavorite.id).not.toBe(firstFavorite.id);
		expect(secondFavorite.createdAt.getTime()).toBeGreaterThan(
			firstFavorite.createdAt.getTime(),
		);
	});

	it("lists current user favorites joined to stories newest first", async () => {
		const { service } = createHarness();

		await service.addFavorite(
			{ workosUserId: "workos-user-1" },
			createStory({ id: 123, title: "Older" }),
		);
		await service.addFavorite(
			{ workosUserId: "workos-user-2" },
			createStory({ id: 456, title: "Other user" }),
		);
		await service.addFavorite(
			{ workosUserId: "workos-user-1" },
			createStory({ id: 789, title: "Newer" }),
		);

		const listedFavorites = await service.listFavorites({
			workosUserId: "workos-user-1",
		});

		expect(listedFavorites).toHaveLength(2);
		expect(listedFavorites.map((favorite) => favorite.story.title)).toEqual([
			"Newer",
			"Older",
		]);
		expect(listedFavorites.map((favorite) => favorite.story.hnStoryId)).toEqual(
			[789, 123],
		);
	});

	it("imports local favorites without deleting existing database favorites", async () => {
		const { favorites, service } = createHarness();

		await service.addFavorite(
			{ workosUserId: "workos-user-1" },
			createStory({ id: 123, title: "Database favorite" }),
		);
		await service.importLocalFavorites({ workosUserId: "workos-user-1" }, [
			createStory({ id: 456, title: "Local favorite" }),
		]);

		expect(favorites).toHaveLength(2);
		expect(favorites.map((favorite) => favorite.storyId)).toEqual([
			"story-1",
			"story-2",
		]);
	});

	it("is safe to retry local favorite imports", async () => {
		const { favorites, service, stories } = createHarness();
		const localStories = [
			createStory({ id: 123 }),
			createStory({ id: 456, title: "Second" }),
		];

		await service.importLocalFavorites(
			{ workosUserId: "workos-user-1" },
			localStories,
		);
		await service.importLocalFavorites(
			{ workosUserId: "workos-user-1" },
			localStories,
		);

		expect(stories).toHaveLength(2);
		expect(favorites).toHaveLength(2);
	});

	it("does not overwrite existing stories when importing stale local favorites", async () => {
		const { favorites, service, stories } = createHarness();

		await service.addFavorite(
			{ workosUserId: "workos-user-2" },
			createStory({
				id: 123,
				score: 100,
				title: "Fresh database title",
				url: "https://example.com/fresh",
			}),
		);
		await service.importLocalFavorites({ workosUserId: "workos-user-1" }, [
			createStory({
				id: 123,
				score: 1,
				title: "Stale local title",
				url: "https://example.com/stale",
			}),
		]);

		expect(stories).toHaveLength(1);
		expect(stories[0]).toMatchObject({
			score: 100,
			title: "Fresh database title",
			url: "https://example.com/fresh",
		});
		expect(favorites).toHaveLength(2);
	});
});
