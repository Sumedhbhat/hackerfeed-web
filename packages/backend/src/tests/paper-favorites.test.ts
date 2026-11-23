import { eq } from "drizzle-orm";
import { describe, expect } from "vitest";
import type { DatabaseContext } from "../database/client";
import {
	activityEvents,
	appUsers,
	hfPapers,
	paperFavorites,
} from "../database/schema";
import { dailyPapersEntry } from "./support/data";
import { ingestEdition } from "./support/seed";
import { INTEGRATION, test } from "./support/test";

const PAPERS = ["2607.00001", "2607.00002", "2607.00003"];

function ingestPapers(
	services: Parameters<typeof ingestEdition>[0],
	entries = PAPERS.map((arxivId) => dailyPapersEntry({ arxivId })),
) {
	return ingestEdition(services, "2026-07-09", entries);
}

async function savedBy(database: DatabaseContext) {
	return database
		.select({ workosUserId: appUsers.workosUserId, id: paperFavorites.id })
		.from(paperFavorites)
		.innerJoin(appUsers, eq(appUsers.id, paperFavorites.appUserId))
		.all();
}

async function activity(database: DatabaseContext) {
	return database
		.select({
			workosUserId: appUsers.workosUserId,
			action: activityEvents.action,
		})
		.from(activityEvents)
		.innerJoin(appUsers, eq(appUsers.id, activityEvents.appUserId))
		.orderBy(activityEvents.id)
		.all();
}

function encodeCursor(value: unknown): string {
	return btoa(JSON.stringify(value))
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replace(/=+$/, "");
}

function decodeCursor(cursor: string): unknown {
	return JSON.parse(atob(cursor.replaceAll("-", "+").replaceAll("_", "/")));
}

describe("saving a paper", () => {
	test(
		"saves it for the signed-in reader, once",
		INTEGRATION,
		async ({ api, database, huggingFace }) => {
			await ingestPapers({ database, huggingFace });
			const reader = api.as("user_1");

			await expect(
				reader.paperFavorites.add.mutate({ arxivId: "2607.00001" }),
			).resolves.toEqual({ arxivId: "2607.00001" });
			await reader.paperFavorites.add.mutate({ arxivId: "2607.00001" });

			expect(await savedBy(database)).toMatchObject([
				{ workosUserId: "user_1" },
			]);
			expect(await activity(database)).toEqual([
				{ workosUserId: "user_1", action: "paper.favorited" },
			]);
		},
	);

	test(
		"answers NOT_FOUND for a paper that was never ingested",
		INTEGRATION,
		async ({ api, database }) => {
			await expect(
				api.as("user_1").paperFavorites.add.mutate({ arxivId: "2607.99999" }),
			).rejects.toMatchObject({
				data: { code: "NOT_FOUND" },
				message: "Paper 2607.99999 was not found",
			});
			expect(await savedBy(database)).toEqual([]);
		},
	);

	test(
		"rejects anything but an arXiv ID, including a forged owner",
		INTEGRATION,
		async ({ api, database, huggingFace }) => {
			await ingestPapers({ database, huggingFace });
			const reader = api.as("user_1");

			for (const input of [
				{ arxivId: "not-an-arxiv-id" },
				{ arxivId: "2607.00001", appUserId: "forged-user" },
			]) {
				await expect(
					reader.paperFavorites.add.mutate(input as { arxivId: string }),
				).rejects.toMatchObject({ data: { code: "BAD_REQUEST" } });
			}
			expect(await savedBy(database)).toEqual([]);
		},
	);

	test("needs a signed-in reader", INTEGRATION, async ({ api }) => {
		for (const procedure of [
			"paperFavorites.list",
			"paperFavorites.add",
			"paperFavorites.remove",
			"paperFavorites.clear",
		]) {
			const response = await api.request(`/api/trpc/${procedure}`, {
				method: procedure.endsWith(".list") ? "GET" : "POST",
			});
			expect(response.status).toBe(401);
		}
	});
});

describe("removing saved papers", () => {
	test(
		"removes only the reader's own save, and logs each real removal",
		INTEGRATION,
		async ({ api, database, huggingFace }) => {
			await ingestPapers({ database, huggingFace });
			const one = api.as("user_1");
			await one.paperFavorites.add.mutate({ arxivId: "2607.00001" });
			await api
				.as("user_2")
				.paperFavorites.add.mutate({ arxivId: "2607.00001" });

			await one.paperFavorites.remove.mutate({ arxivId: "2607.00001" });
			await one.paperFavorites.remove.mutate({ arxivId: "2607.00001" });
			await one.paperFavorites.remove.mutate({ arxivId: "2607.99999" });

			expect(await savedBy(database)).toMatchObject([
				{ workosUserId: "user_2" },
			]);
			expect(await activity(database)).toEqual([
				{ workosUserId: "user_1", action: "paper.favorited" },
				{ workosUserId: "user_2", action: "paper.favorited" },
				{ workosUserId: "user_1", action: "paper.unfavorited" },
			]);
		},
	);

	test(
		"clearing removes only the reader's saves and logs each one",
		INTEGRATION,
		async ({ api, database, huggingFace }) => {
			await ingestPapers({ database, huggingFace });
			const one = api.as("user_1");
			await one.paperFavorites.add.mutate({ arxivId: "2607.00001" });
			await one.paperFavorites.add.mutate({ arxivId: "2607.00002" });
			await api
				.as("user_2")
				.paperFavorites.add.mutate({ arxivId: "2607.00003" });

			await one.paperFavorites.clear.mutate();

			expect(await savedBy(database)).toMatchObject([
				{ workosUserId: "user_2" },
			]);
			expect(
				(await activity(database)).filter(
					({ action }) => action === "paper.unfavorited",
				),
			).toEqual([
				{ workosUserId: "user_1", action: "paper.unfavorited" },
				{ workosUserId: "user_1", action: "paper.unfavorited" },
			]);
		},
	);
});

describe("listing saved papers", () => {
	test(
		"pages newest first, breaking ties by ID, with each paper's metadata",
		INTEGRATION,
		async ({ api, database, huggingFace }) => {
			await ingestPapers({ database, huggingFace }, [
				dailyPapersEntry({ arxivId: "2607.00001" }),
				dailyPapersEntry({
					arxivId: "2607.00002",
					title: "Paper two",
					summary: "Source summary",
					aiSummary: null,
					authors: ["Ada Lovelace", "Grace Hopper"],
					keywords: ["Agents", "Reasoning"],
					githubRepo: "https://github.com/example/paper",
					projectPage: "https://example.com/paper",
					upvotes: 42,
				}),
				dailyPapersEntry({ arxivId: "2607.00003" }),
			]);
			const reader = api.as("user_1");
			for (const arxivId of PAPERS) {
				await reader.paperFavorites.add.mutate({ arxivId });
			}
			await database
				.update(paperFavorites)
				.set({ createdAt: "2026-07-10 12:00:00" })
				.run();
			const byNewest = (
				await database
					.select({ id: paperFavorites.id, arxivId: hfPapers.arxivId })
					.from(paperFavorites)
					.innerJoin(hfPapers, eq(hfPapers.id, paperFavorites.paperId))
					.all()
			).sort((left, right) => right.id.localeCompare(left.id));

			const firstPage = await reader.paperFavorites.list.query({ limit: 2 });
			expect(firstPage.items.map((paper) => paper.arxivId)).toEqual(
				byNewest.slice(0, 2).map(({ arxivId }) => arxivId),
			);
			expect(decodeCursor(firstPage.nextCursor ?? "")).toEqual({
				v: 1,
				createdAt: "2026-07-10 12:00:00",
				id: byNewest[1]?.id,
			});
			const secondPage = await reader.paperFavorites.list.query({
				cursor: firstPage.nextCursor ?? undefined,
				limit: 2,
			});
			expect(secondPage.items.map((paper) => paper.arxivId)).toEqual([
				byNewest[2]?.arxivId,
			]);
			expect(secondPage.nextCursor).toBeNull();

			const listed = [...firstPage.items, ...secondPage.items];
			expect(listed.find((paper) => paper.arxivId === "2607.00002")).toEqual({
				abstract: null,
				arxivId: "2607.00002",
				authors: ["Ada Lovelace", "Grace Hopper"],
				githubRepo: "https://github.com/example/paper",
				keywords: ["agents", "reasoning"],
				paperPublishedAt: "2026-06-18T00:00:00.000Z",
				paperUrl: "https://arxiv.org/abs/2607.00002",
				projectPage: "https://example.com/paper",
				savedAt: "2026-07-10T12:00:00.000Z",
				summary: "Source summary",
				title: "Paper two",
				upvotes: 42,
			});
		},
	);

	test(
		"never shows another reader's saves",
		INTEGRATION,
		async ({ api, database, huggingFace }) => {
			await ingestPapers({ database, huggingFace });
			await api
				.as("user_2")
				.paperFavorites.add.mutate({ arxivId: "2607.00001" });

			await expect(
				api.as("user_1").paperFavorites.list.query({}),
			).resolves.toEqual({ items: [], nextCursor: null });
		},
	);

	test(
		"drops unsafe links from saved papers",
		INTEGRATION,
		async ({ api, database, huggingFace }) => {
			await ingestPapers({ database, huggingFace }, [
				dailyPapersEntry({
					arxivId: "2607.00001",
					githubRepo: "javascript:alert(1)",
					projectPage: "http://example.com/project",
				}),
			]);
			const reader = api.as("user_1");
			await reader.paperFavorites.add.mutate({ arxivId: "2607.00001" });

			const { items } = await reader.paperFavorites.list.query({});

			expect(items[0]).toMatchObject({ githubRepo: null, projectPage: null });
		},
	);

	test.for([0, 51])(
		"rejects a page size of %s",
		INTEGRATION,
		async (limit, { api }) => {
			await expect(
				api.as("user_1").paperFavorites.list.query({ limit }),
			).rejects.toMatchObject({ data: { code: "BAD_REQUEST" } });
		},
	);

	const favoriteId = "00000000-0000-4000-8000-000000000001";
	test.for([
		["malformed base64", "not+a+cursor"],
		[
			"an unsupported version",
			encodeCursor({ v: 2, createdAt: "2026-07-10 12:00:00", id: favoriteId }),
		],
		[
			"an invalid date",
			encodeCursor({ v: 1, createdAt: "2026-02-30 12:00:00", id: favoriteId }),
		],
		[
			"a non-D1 timestamp",
			encodeCursor({
				v: 1,
				createdAt: "2026-07-10T12:00:00.000Z",
				id: favoriteId,
			}),
		],
		[
			"an invalid favorite ID",
			encodeCursor({
				v: 1,
				createdAt: "2026-07-10 12:00:00",
				id: "favorite-001",
			}),
		],
		[
			"an extra field",
			encodeCursor({
				v: 1,
				createdAt: "2026-07-10 12:00:00",
				id: favoriteId,
				extra: true,
			}),
		],
	])(
		"answers BAD_REQUEST for a cursor with %s",
		INTEGRATION,
		async ([, cursor], { api }) => {
			await expect(
				api.as("user_1").paperFavorites.list.query({ cursor }),
			).rejects.toMatchObject({
				data: { code: "BAD_REQUEST" },
				message: "Invalid paper favorites cursor",
			});
		},
	);
});
