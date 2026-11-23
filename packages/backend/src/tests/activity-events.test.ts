import { describe, expect } from "vitest";
import { insertActivityEvent, readerActivityEvents } from "../activity/events";
import type { DatabaseContext } from "../database/client";
import { activityEvents, stories } from "../database/schema";
import { createUserRepository } from "../users/repository";
import { INTEGRATION, test } from "./support/test";

async function seedReaders(database: DatabaseContext) {
	const users = createUserRepository(database);
	const alice = await users.getOrCreateByWorkosUserId("user_alice");
	const bob = await users.getOrCreateByWorkosUserId("user_bob");
	const [story] = await database
		.insert(stories)
		.values({ hnStoryId: 123 })
		.returning()
		.all();
	return { alice, bob, storyId: story?.id ?? "" };
}

describe("a reader's activity events", () => {
	test("show only that reader's events", INTEGRATION, async ({ database }) => {
		const { alice, bob, storyId } = await seedReaders(database);
		await insertActivityEvent(database, alice.id, {
			action: "story.read",
			storyId,
		}).run();
		await insertActivityEvent(database, bob.id, {
			action: "story.read",
			storyId,
		}).run();
		await insertActivityEvent(database, bob.id, {
			action: "story.chat_opened",
			storyId,
		}).run();

		const events = readerActivityEvents(database, alice.id);
		const rows = await database
			.with(events)
			.select({ appUserId: events.appUserId, action: events.action })
			.from(events)
			.all();

		expect(rows).toEqual([{ appUserId: alice.id, action: "story.read" }]);
	});

	test(
		"are recorded as the reader's own",
		INTEGRATION,
		async ({ database }) => {
			const { alice, storyId } = await seedReaders(database);

			await insertActivityEvent(database, alice.id, {
				action: "story.read",
				storyId,
			}).run();

			expect(await database.select().from(activityEvents).all()).toEqual([
				expect.objectContaining({
					appUserId: alice.id,
					lastUpdatedBy: alice.id,
					action: "story.read",
					storyId,
					paperId: null,
				}),
			]);
		},
	);
});
