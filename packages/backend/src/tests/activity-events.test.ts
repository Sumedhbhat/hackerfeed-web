import { describe, expect } from "vitest";
import { insertActivityEvent, readerActivityEvents } from "../activity/events";
import type { DatabaseContext } from "../database/client";
import { activityEvents, stories } from "../database/schema";
import { createUserRepository } from "../users/repository";
import { INTEGRATION, test } from "./support/test";

async function seedReaders(database: DatabaseContext) {
	const users = createUserRepository(database);
	const alice = await users.getOrCreateByWorkosUserId("user_alice");
	const [story] = await database
		.insert(stories)
		.values({ hnStoryId: 123 })
		.returning()
		.all();
	return { alice, storyId: story?.id ?? "" };
}

describe("a reader's activity events", () => {
	test(
		"show only that reader's events",
		INTEGRATION,
		async ({ world: { alice }, database }) => {
			const everyone = await database
				.select({ appUserId: activityEvents.appUserId, id: activityEvents.id })
				.from(activityEvents)
				.orderBy(activityEvents.id)
				.all();
			const events = readerActivityEvents(database, alice.appUserId);

			const rows = await database
				.with(events)
				.select({ appUserId: events.appUserId, id: events.id })
				.from(events)
				.orderBy(events.id)
				.all();

			expect(rows).toEqual(
				everyone.filter(({ appUserId }) => appUserId === alice.appUserId),
			);
			expect(rows.length).toBeLessThan(everyone.length);
		},
	);

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
