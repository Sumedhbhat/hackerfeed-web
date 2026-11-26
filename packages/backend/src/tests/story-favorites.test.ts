import { asc, eq } from "drizzle-orm";
import { describe, expect } from "vitest";
import { UnauthorizedError } from "../auth/current-user";
import type { DatabaseContext } from "../database/client";
import {
	activityEvents,
	appUsers,
	favorites,
	stories,
} from "../database/schema";
import { createFavoriteServiceFromDatabase } from "../favorites/service";
import { hnStory } from "./support/data";
import { INTEGRATION, test } from "./support/test";

function byNumber(ids: number[]) {
	return [...ids].sort((left, right) => left - right);
}

function storiesInDatabase(database: DatabaseContext) {
	return database.select().from(stories).orderBy(asc(stories.hnStoryId)).all();
}

async function favoritesOf(database: DatabaseContext, workosUserId: string) {
	return database
		.select({ hnStoryId: stories.hnStoryId, favoriteId: favorites.id })
		.from(favorites)
		.innerJoin(appUsers, eq(appUsers.id, favorites.appUserId))
		.innerJoin(stories, eq(stories.id, favorites.storyId))
		.where(eq(appUsers.workosUserId, workosUserId))
		.orderBy(asc(stories.hnStoryId))
		.all();
}

function favoriteActivity(database: DatabaseContext) {
	return database
		.select({ action: activityEvents.action, hnStoryId: stories.hnStoryId })
		.from(activityEvents)
		.innerJoin(stories, eq(stories.id, activityEvents.storyId))
		.orderBy(asc(activityEvents.id))
		.all();
}

describe("saving a story", () => {
	test(
		"creates the reader, the shared story and the favorite",
		INTEGRATION,
		async ({ api, database }) => {
			const story = hnStory();

			await expect(
				api.as("user_alice").favorites.add.mutate(story),
			).resolves.toEqual(story);

			expect(await database.select().from(appUsers).all()).toEqual([
				{ id: expect.any(String), workosUserId: "user_alice" },
			]);
			expect(await storiesInDatabase(database)).toMatchObject([
				{ hnStoryId: 123 },
			]);
			expect(await favoritesOf(database, "user_alice")).toMatchObject([
				{ hnStoryId: 123 },
			]);
		},
	);

	test(
		"twice keeps one favorite and logs it once",
		INTEGRATION,
		async ({ api, database }) => {
			const alice = api.as("user_alice");

			await alice.favorites.add.mutate(hnStory());
			await alice.favorites.add.mutate(hnStory());

			expect(await storiesInDatabase(database)).toHaveLength(1);
			expect(await favoritesOf(database, "user_alice")).toHaveLength(1);
			expect(await favoriteActivity(database)).toEqual([
				{ action: "story.favorited", hnStoryId: 123 },
			]);
		},
	);

	test(
		"again refreshes the story's changing fields",
		INTEGRATION,
		async ({ api, database }) => {
			const alice = api.as("user_alice");

			await alice.favorites.add.mutate(hnStory());
			await alice.favorites.add.mutate(
				hnStory({
					by: "bob",
					descendants: 9,
					kids: [8, 7, 6],
					score: 100,
					time: 1_700_001_000,
					title: "Updated title",
					url: "https://example.com/updated",
				}),
			);

			expect(await storiesInDatabase(database)).toMatchObject([
				{
					authorUsername: "bob",
					commentCount: 9,
					commentIds: "[8,7,6]",
					score: 100,
					hnPostedAt: "2023-11-14T22:30:00.000Z",
					title: "Updated title",
					url: "https://example.com/updated",
				},
			]);
			expect(await favoritesOf(database, "user_alice")).toHaveLength(1);
		},
	);

	test(
		"after removing it saves a new favorite",
		INTEGRATION,
		async ({ api, database }) => {
			const alice = api.as("user_alice");

			await alice.favorites.add.mutate(hnStory());
			const [first] = await favoritesOf(database, "user_alice");
			await alice.favorites.remove.mutate({ hnStoryId: 123 });
			await alice.favorites.add.mutate(hnStory());

			const saved = await favoritesOf(database, "user_alice");
			expect(saved).toHaveLength(1);
			expect(saved[0]?.favoriteId).not.toBe(first?.favoriteId);
		},
	);

	test("needs a signed-in reader", INTEGRATION, async ({ api, database }) => {
		const response = await api.request("/api/trpc/favorites.add", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ json: hnStory() }),
		});

		expect(response.status).toBe(401);
		await expect(
			createFavoriteServiceFromDatabase(database).addFavorite(null, hnStory()),
		).rejects.toBeInstanceOf(UnauthorizedError);
		expect(await storiesInDatabase(database)).toEqual([]);
	});
});

describe("listing saved stories", () => {
	test(
		"returns the reader's own as story records, newest first, with their last view",
		INTEGRATION,
		async ({ api, database }) => {
			const alice = api.as("user_alice");
			await alice.favorites.add.mutate(hnStory({ id: 123, title: "Older" }));
			await api
				.as("user_bob")
				.favorites.add.mutate(hnStory({ id: 456, title: "Other reader" }));
			await alice.favorites.add.mutate(hnStory({ id: 789, title: "Newer" }));
			await alice.views.story.mutate({
				action: "read",
				story: hnStory({ id: 789, title: "Newer" }),
			});
			const [older, newer] = await favoritesOf(database, "user_alice");
			await database
				.update(favorites)
				.set({ createdAt: "2026-01-01 10:00:00" })
				.where(eq(favorites.id, older?.favoriteId ?? ""))
				.run();
			await database
				.update(favorites)
				.set({ createdAt: "2026-01-02 10:00:00" })
				.where(eq(favorites.id, newer?.favoriteId ?? ""))
				.run();

			const listed = await alice.favorites.list.query();

			expect(listed).toEqual([
				{
					...hnStory({ id: 789, title: "Newer" }),
					lastViewedAt: expect.any(Date),
				},
				{ ...hnStory({ id: 123, title: "Older" }), lastViewedAt: null },
			]);
		},
	);

	test(
		"shows a story saved by several readers to each of them",
		INTEGRATION,
		async ({ world: { alice, bob } }) => {
			const savedIds = async (reader: typeof alice) =>
				(await reader.client.favorites.list.query()).map(({ id }) => id);

			expect(byNumber(await savedIds(alice))).toEqual(
				byNumber(alice.savedStories),
			);
			expect(byNumber(await savedIds(bob))).toEqual(byNumber(bob.savedStories));
		},
	);

	test(
		"orders favorites saved at the same time by descending ID",
		INTEGRATION,
		async ({ api, database }) => {
			const alice = api.as("user_alice");
			await alice.favorites.add.mutate(hnStory({ id: 1 }));
			await alice.favorites.add.mutate(hnStory({ id: 2 }));
			await alice.favorites.add.mutate(hnStory({ id: 3 }));
			const saved = await favoritesOf(database, "user_alice");
			const ids = ["favorite-b", "favorite-c", "favorite-a"];
			for (const [index, favorite] of saved.entries()) {
				await database
					.update(favorites)
					.set({ id: ids[index], createdAt: "2026-01-01 10:00:00" })
					.where(eq(favorites.id, favorite.favoriteId))
					.run();
			}

			const listed = await alice.favorites.list.query();

			expect(listed.map((story) => story.id)).toEqual([2, 1, 3]);
		},
	);
});

describe("removing saved stories", () => {
	test(
		"is safe for saved, already removed and unknown stories, and logs each removal",
		INTEGRATION,
		async ({ api, database }) => {
			const alice = api.as("user_alice");

			await alice.favorites.add.mutate(hnStory());
			await alice.favorites.remove.mutate({ hnStoryId: 123 });
			await alice.favorites.remove.mutate({ hnStoryId: 123 });
			await alice.favorites.remove.mutate({ hnStoryId: 999 });

			expect(await favoritesOf(database, "user_alice")).toEqual([]);
			expect(await favoriteActivity(database)).toEqual([
				{ action: "story.favorited", hnStoryId: 123 },
				{ action: "story.unfavorited", hnStoryId: 123 },
			]);
		},
	);

	test(
		"clearing removes only the reader's own and logs each",
		INTEGRATION,
		async ({ world: { alice, bob }, database }) => {
			await alice.client.favorites.clear.mutate();

			expect(await favoritesOf(database, alice.workosUserId)).toEqual([]);
			expect(await favoritesOf(database, bob.workosUserId)).toMatchObject(
				bob.savedStories.map((hnStoryId) => ({ hnStoryId })),
			);
			const unfavorited = (await favoriteActivity(database))
				.filter(({ action }) => action === "story.unfavorited")
				.map(({ hnStoryId }) => hnStoryId);
			expect(byNumber(unfavorited)).toEqual(byNumber(alice.savedStories));
		},
	);
});

describe("importing favorites saved on the device", () => {
	test(
		"adds them next to the reader's saved stories without logging activity",
		INTEGRATION,
		async ({ api, database }) => {
			const alice = api.as("user_alice");
			await alice.favorites.add.mutate(
				hnStory({ id: 123, title: "Database favorite" }),
			);
			const local = [hnStory({ id: 456, title: "Local favorite" })];

			await expect(
				alice.favorites.importLocal.mutate({ stories: local }),
			).resolves.toEqual(local);

			expect(await favoritesOf(database, "user_alice")).toMatchObject([
				{ hnStoryId: 123 },
				{ hnStoryId: 456 },
			]);
			expect(await favoriteActivity(database)).toEqual([
				{ action: "story.favorited", hnStoryId: 123 },
			]);
		},
	);

	test("is safe to retry", INTEGRATION, async ({ api, database }) => {
		const alice = api.as("user_alice");
		const local = [hnStory({ id: 123 }), hnStory({ id: 456, title: "Second" })];

		await alice.favorites.importLocal.mutate({ stories: local });
		await alice.favorites.importLocal.mutate({ stories: local });

		expect(await storiesInDatabase(database)).toHaveLength(2);
		expect(await favoritesOf(database, "user_alice")).toHaveLength(2);
	});

	test(
		"keeps the fresher story already in the database",
		INTEGRATION,
		async ({ api, database }) => {
			await api.as("user_bob").favorites.add.mutate(
				hnStory({
					score: 100,
					title: "Fresh database title",
					url: "https://example.com/fresh",
				}),
			);

			await api.as("user_alice").favorites.importLocal.mutate({
				stories: [
					hnStory({
						score: 1,
						title: "Stale local title",
						url: "https://example.com/stale",
					}),
				],
			});

			expect(await storiesInDatabase(database)).toMatchObject([
				{
					score: 100,
					title: "Fresh database title",
					url: "https://example.com/fresh",
				},
			]);
			expect(await favoritesOf(database, "user_alice")).toHaveLength(1);
			expect(await favoritesOf(database, "user_bob")).toHaveLength(1);
		},
	);
});
