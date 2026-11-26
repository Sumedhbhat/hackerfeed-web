import type { HackerNewsStoryRecord } from "@hackerfeed/entities/hacker-news";
import { eq } from "drizzle-orm";
import { describe, expect } from "vitest";
import type { DatabaseContext } from "../database/client";
import { activityEvents, hfPapers, stories } from "../database/schema";
import { hnStory } from "./support/data";
import { appUserIdOf, ingestEdition } from "./support/seed";
import { INTEGRATION, test } from "./support/test";

function events(database: DatabaseContext) {
	return database
		.select({
			appUserId: activityEvents.appUserId,
			action: activityEvents.action,
			storyId: activityEvents.storyId,
			paperId: activityEvents.paperId,
			lastUpdatedBy: activityEvents.lastUpdatedBy,
		})
		.from(activityEvents)
		.orderBy(activityEvents.id)
		.all();
}

describe("recording a story view", () => {
	test(
		"stores the story and logs each click as the signed-in reader",
		INTEGRATION,
		async ({ api, database }) => {
			const alice = api.as("user_alice");

			await alice.views.story.mutate({ action: "read", story: hnStory() });
			await alice.views.story.mutate({
				action: "discussion_opened",
				story: hnStory({ title: "Edited title", score: 50 }),
			});
			await alice.views.story.mutate({
				action: "chat_opened",
				story: hnStory(),
			});

			const storedStories = await database.select().from(stories).all();
			expect(storedStories).toMatchObject([
				{ hnStoryId: 123, title: "Original title", score: 42 },
			]);
			const reader = await appUserIdOf(database, "user_alice");
			const storyId = storedStories[0]?.id;
			expect(await events(database)).toEqual(
				["story.read", "story.discussion_opened", "story.chat_opened"].map(
					(action) => ({
						appUserId: reader,
						action,
						storyId,
						paperId: null,
						lastUpdatedBy: reader,
					}),
				),
			);
		},
	);

	test(
		"rejects unknown actions without logging anything",
		INTEGRATION,
		async ({ api, database }) => {
			await expect(
				api.as("user_alice").views.story.mutate({
					action: "favorited",
					story: hnStory(),
				} as unknown as { action: "read"; story: HackerNewsStoryRecord }),
			).rejects.toMatchObject({ data: { code: "BAD_REQUEST" } });
			expect(await events(database)).toEqual([]);
		},
	);
});

describe("when a reader last viewed stories", () => {
	test(
		"is the latest read or discussion open of that reader alone",
		INTEGRATION,
		async ({ api, database }) => {
			const alice = api.as("user_alice");
			await alice.views.story.mutate({ action: "read", story: hnStory() });
			await alice.views.story.mutate({
				action: "discussion_opened",
				story: hnStory(),
			});
			await alice.views.story.mutate({
				action: "chat_opened",
				story: hnStory({ id: 456 }),
			});
			await api
				.as("user_bob")
				.views.story.mutate({ action: "read", story: hnStory({ id: 789 }) });
			const [first, second] = await database
				.select({ id: activityEvents.id })
				.from(activityEvents)
				.orderBy(activityEvents.id);
			for (const [event, occurredAt] of [
				[first, "2026-11-20 09:30:00"],
				[second, "2026-11-21 08:00:00"],
			] as const) {
				await database
					.update(activityEvents)
					.set({ occurredAt })
					.where(eq(activityEvents.id, event?.id ?? 0))
					.run();
			}

			await expect(
				alice.views.storiesLastViewed.query({ hnStoryIds: [123, 456, 789] }),
			).resolves.toEqual([
				{ hnStoryId: 123, lastViewedAt: new Date("2026-11-21T08:00:00Z") },
			]);
		},
	);

	test(
		"is empty when no stories are asked about",
		INTEGRATION,
		async ({ api }) => {
			await expect(
				api.as("user_alice").views.storiesLastViewed.query({ hnStoryIds: [] }),
			).resolves.toEqual([]);
		},
	);

	test(
		"asks about at most 50 stories, below D1's bound-parameter limit",
		INTEGRATION,
		async ({ api }) => {
			const hnStoryIds = Array.from({ length: 51 }, (_, index) => index + 1);

			await expect(
				api.as("user_alice").views.storiesLastViewed.query({ hnStoryIds }),
			).rejects.toMatchObject({ data: { code: "BAD_REQUEST" } });
		},
	);
});

describe("recording a paper view", () => {
	test(
		"logs the click against the stored paper as the signed-in reader",
		INTEGRATION,
		async ({ api, database, huggingFace }) => {
			await ingestEdition({ database, huggingFace }, "2026-06-20");
			const alice = api.as("user_alice");

			await alice.views.paper.mutate({ action: "read", arxivId: "2606.00001" });
			await alice.views.paper.mutate({
				action: "chat_opened",
				arxivId: "2606.00001",
			});

			const [paper] = await database
				.select({ id: hfPapers.id })
				.from(hfPapers)
				.where(eq(hfPapers.arxivId, "2606.00001"));
			const reader = await appUserIdOf(database, "user_alice");
			expect(await events(database)).toEqual(
				["paper.read", "paper.chat_opened"].map((action) => ({
					appUserId: reader,
					action,
					storyId: null,
					paperId: paper?.id,
					lastUpdatedBy: reader,
				})),
			);
		},
	);

	test(
		"answers NOT_FOUND for a paper that is not stored",
		INTEGRATION,
		async ({ api, database }) => {
			await expect(
				api
					.as("user_alice")
					.views.paper.mutate({ action: "read", arxivId: "2607.99999" }),
			).rejects.toMatchObject({
				data: { code: "NOT_FOUND" },
				message: "Paper 2607.99999 was not found",
			});
			expect(await events(database)).toEqual([]);
		},
	);

	test(
		"rejects a forged reader or a malformed arXiv ID",
		INTEGRATION,
		async ({ api, database, huggingFace }) => {
			await ingestEdition({ database, huggingFace }, "2026-06-20");
			const alice = api.as("user_alice");

			await expect(
				alice.views.paper.mutate({
					action: "read",
					arxivId: "2606.00001",
					appUserId: "forged-user",
				} as { action: "read"; arxivId: string }),
			).rejects.toMatchObject({ data: { code: "BAD_REQUEST" } });
			await expect(
				alice.views.paper.mutate({
					action: "read",
					arxivId: "not-an-arxiv-id",
				}),
			).rejects.toMatchObject({ data: { code: "BAD_REQUEST" } });
			expect(await events(database)).toEqual([]);
		},
	);
});

describe("view activity without a session", () => {
	test(
		"is rejected with 401 before any procedure runs",
		INTEGRATION,
		async ({ api, database }) => {
			for (const procedure of [
				"views.storiesLastViewed",
				"views.story",
				"views.paper",
			]) {
				const response = await api.request(`/api/trpc/${procedure}`, {
					method: "POST",
				});
				expect(response.status).toBe(401);
			}
			expect(await events(database)).toEqual([]);
		},
	);
});
