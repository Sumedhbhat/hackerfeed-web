import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import type { HackerNewsStoryRecord } from "#/lib/hacker-news/queries";
import type { DatabaseContext } from "#/server/database/client";
import { createTrpcContext } from "./context";
import { createAppRouter } from "./router";

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
	const database = {} as DatabaseContext;
	const calls: Array<
		| { name: "list"; user: unknown }
		| { name: "add"; user: unknown; story: HackerNewsStoryRecord }
		| { name: "remove"; user: unknown; hnStoryId: number }
		| { name: "clear"; user: unknown }
		| { name: "importLocal"; user: unknown; stories: HackerNewsStoryRecord[] }
	> = [];

	const favorites = {
		async listFavorites(user: unknown) {
			calls.push({ name: "list", user });

			return [
				{
					story: {
						hnStoryId: 123,
						title: "Original title",
						url: "https://example.com/original",
						text: null,
						score: 42,
						hnPostedAt: new Date(1_700_000_000_000),
						authorUsername: "alice",
						commentCount: 3,
						commentIds: [1, 2],
					},
				},
			];
		},

		async addFavorite(user: unknown, story: HackerNewsStoryRecord) {
			calls.push({ name: "add", user, story });
		},

		async removeFavorite(user: unknown, hnStoryId: number) {
			calls.push({ name: "remove", user, hnStoryId });
		},

		async clearFavorites(user: unknown) {
			calls.push({ name: "clear", user });
		},

		async importLocalFavorites(
			user: unknown,
			stories: HackerNewsStoryRecord[],
		) {
			calls.push({ name: "importLocal", user, stories });
		},
	};

	const router = createAppRouter(favorites);
	const caller = router.createCaller(
		createTrpcContext({
			database,
			user: { workosUserId: "workos-user-1" },
		}),
	);

	return { caller, calls, database, router };
}

describe("favorites tRPC router", () => {
	it("lists favorites as current UI story records", async () => {
		const { caller, calls } = createHarness();

		await expect(caller.favorites.list()).resolves.toEqual([
			createStory({ id: 123 }),
		]);
		expect(calls).toEqual([
			{ name: "list", user: { workosUserId: "workos-user-1" } },
		]);
	});

	it("adds a favorite through the favorite service", async () => {
		const { caller, calls } = createHarness();
		const story = createStory();

		await expect(caller.favorites.add(story)).resolves.toEqual(story);
		expect(calls).toEqual([
			{ name: "add", user: { workosUserId: "workos-user-1" }, story },
		]);
	});

	it("removes a favorite through the favorite service", async () => {
		const { caller, calls } = createHarness();

		await caller.favorites.remove({ hnStoryId: 123 });
		expect(calls).toEqual([
			{
				name: "remove",
				user: { workosUserId: "workos-user-1" },
				hnStoryId: 123,
			},
		]);
	});

	it("clears favorites through the favorite service", async () => {
		const { caller, calls } = createHarness();

		await caller.favorites.clear();
		expect(calls).toEqual([
			{ name: "clear", user: { workosUserId: "workos-user-1" } },
		]);
	});

	it("imports local favorites through the favorite service", async () => {
		const { caller, calls } = createHarness();
		const stories = [createStory(), createStory({ id: 456 })];

		await expect(caller.favorites.importLocal({ stories })).resolves.toEqual(
			stories,
		);
		expect(calls).toEqual([
			{
				name: "importLocal",
				user: { workosUserId: "workos-user-1" },
				stories,
			},
		]);
	});

	it("rejects unauthorized calls consistently", async () => {
		const { database, router } = createHarness();
		const caller = router.createCaller(createTrpcContext({ database }));

		await expect(caller.favorites.list()).rejects.toMatchObject({
			code: "UNAUTHORIZED",
		});
		await expect(caller.favorites.add(createStory())).rejects.toBeInstanceOf(
			TRPCError,
		);
	});
});
