import { sql } from "drizzle-orm";
import { describe, expect } from "vitest";
import type { DatabaseContext } from "../database/client";
import {
	type ActivityAction,
	activityEvents,
	hfPapers,
	stories,
} from "../database/schema";
import { appUserIdOf, ingestEdition } from "./support/seed";
import { INTEGRATION, test } from "./support/test";

async function storyIds(database: DatabaseContext, hnStoryIds: number[]) {
	const rows = await database
		.insert(stories)
		.values(hnStoryIds.map((hnStoryId) => ({ hnStoryId })))
		.returning({ id: stories.id });
	return rows.map(({ id }) => id);
}

async function paperIds(database: DatabaseContext) {
	const rows = await database
		.select({ id: hfPapers.id })
		.from(hfPapers)
		.orderBy(hfPapers.arxivId);
	return rows.map(({ id }) => id);
}

function logEvent(
	database: DatabaseContext,
	appUserId: string,
	action: ActivityAction,
	subject: { storyId: string } | { paperId: string },
	occurredAt: string,
) {
	return database
		.insert(activityEvents)
		.values({
			appUserId,
			action,
			...subject,
			occurredAt,
			lastUpdatedBy: appUserId,
		})
		.run();
}

describe("a reader's reading days", () => {
	test(
		"count each reader's distinct stories and papers on their local calendar",
		INTEGRATION,
		async ({ api, database, huggingFace }) => {
			await ingestEdition({ database, huggingFace }, "2026-06-20");
			const [paper1, paper2] = await paperIds(database);
			const [story1, story2] = await storyIds(database, [1, 2]);
			const alice = await appUserIdOf(database, "user_alice");
			const bob = await appUserIdOf(database, "user_bob");
			if (!paper1 || !paper2 || !story1 || !story2) throw new Error("seed");

			const july = "2026-07-01 04:3";
			await logEvent(
				database,
				alice,
				"story.read",
				{ storyId: story1 },
				`${july}0:00`,
			);
			await logEvent(
				database,
				alice,
				"story.read",
				{ storyId: story1 },
				`${july}0:00`,
			);
			await logEvent(
				database,
				alice,
				"story.discussion_opened",
				{ storyId: story1 },
				`${july}2:00`,
			);
			await logEvent(
				database,
				alice,
				"paper.read",
				{ paperId: paper1 },
				`${july}5:00`,
			);
			await logEvent(
				database,
				bob,
				"paper.read",
				{ paperId: paper2 },
				`${july}5:00`,
			);
			await logEvent(
				database,
				alice,
				"story.chat_opened",
				{ storyId: story2 },
				`${july}5:00`,
			);
			await logEvent(
				database,
				alice,
				"paper.chat_opened",
				{ paperId: paper2 },
				`${july}5:00`,
			);
			await logEvent(
				database,
				alice,
				"story.read",
				{ storyId: story1 },
				"2026-12-01 04:30:00",
			);

			await expect(
				api
					.as("user_alice")
					.analytics.readingDays.query({ timeZone: "America/New_York" }),
			).resolves.toEqual([
				{ date: "2026-07-01", stories: 1, papers: 1 },
				{ date: "2026-11-30", stories: 1, papers: 0 },
			]);
		},
	);

	test(
		"keep reads at the same second across page boundaries",
		INTEGRATION,
		async ({ api, database }) => {
			const [story1, story2] = await storyIds(database, [1, 2]);
			const alice = await appUserIdOf(database, "user_alice");
			if (!story1 || !story2) throw new Error("seed");
			await database.run(sql`
			insert into ${activityEvents} (appUserId, action, storyId, occurredAt, lastUpdatedBy)
			with recursive n(i) as (select 1 union all select i + 1 from n where i < 1000)
			select ${alice}, 'story.read', ${story1}, '2026-07-01 04:30:00', ${alice} from n
		`);
			await logEvent(
				database,
				alice,
				"story.read",
				{ storyId: story2 },
				"2026-07-01 04:30:00",
			);

			await expect(
				api.as("user_alice").analytics.readingDays.query({ timeZone: "UTC" }),
			).resolves.toEqual([{ date: "2026-07-01", stories: 2, papers: 0 }]);
		},
	);

	test(
		"are empty for a reader who has read nothing",
		INTEGRATION,
		async ({ api }) => {
			await expect(
				api.as("user_new").analytics.readingDays.query({ timeZone: "UTC" }),
			).resolves.toEqual([]);
		},
	);

	test("reject invalid time zones", INTEGRATION, async ({ api }) => {
		const alice = api.as("user_alice");

		for (const timeZone of ["Mars/Olympus", ""]) {
			await expect(
				alice.analytics.readingDays.query({ timeZone }),
			).rejects.toMatchObject({ data: { code: "BAD_REQUEST" } });
		}
	});

	test("need a session", INTEGRATION, async ({ api }) => {
		const response = await api.request("/api/trpc/analytics.readingDays");

		expect(response.status).toBe(401);
	});
});
