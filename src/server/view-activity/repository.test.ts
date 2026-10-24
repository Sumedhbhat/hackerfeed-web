import { describe, expect, it, vi } from "vitest";
import type { HackerNewsStoryRecord } from "#/lib/hacker-news/queries";
import {
	createDatabaseContext,
	type D1DatabaseBinding,
} from "#/server/database/client";
import { createViewActivityRepository } from "./repository";

type CapturedStatement = { sql: string; values: unknown[] };

function story(): HackerNewsStoryRecord {
	return {
		by: "alice",
		descendants: 3,
		id: 123,
		kids: [1, 2],
		score: 42,
		text: null,
		time: 1_700_000_000,
		title: "Story",
		type: "story",
		url: "https://example.com/story",
	};
}

function createDatabase() {
	const batches: CapturedStatement[][] = [];
	const statements: CapturedStatement[] = [];
	const binding = {
		prepare(sql: string) {
			return {
				bind(...values: unknown[]) {
					const statement = {
						sql,
						values,
						run: vi.fn().mockResolvedValue({ success: true }),
						raw: vi
							.fn()
							.mockResolvedValue(
								sql.includes('from "hf_papers"') ? [["paper-1"]] : [],
							),
					};
					statements.push(statement);
					return statement;
				},
			};
		},
		batch(batch: CapturedStatement[]) {
			batches.push(batch);
			return Promise.resolve([]);
		},
	} as unknown as D1DatabaseBinding;

	return {
		batches,
		database: createDatabaseContext(binding),
		statements,
	};
}

describe("view activity repository", () => {
	it("atomically upserts a story and logs the activity with server audit identity", async () => {
		const { batches, database } = createDatabase();
		const repository = createViewActivityRepository(database);

		await repository.recordStoryView("user-1", story(), "discussion_opened");

		expect(batches).toHaveLength(1);
		expect(batches[0]).toHaveLength(2);
		expect(batches[0]?.[0]?.sql).toContain(
			'on conflict ("stories"."hnStoryId") do update',
		);
		expect(batches[0]?.[1]?.sql).toContain('insert into "activity_events"');
		expect(batches[0]?.[1]?.values).toContain("story.discussion_opened");
		expect(batches[0]?.[1]?.sql).toContain(
			'select "stories"."id" from "stories" where "stories"."hnStoryId" = ?',
		);
		expect(batches[0]?.[1]?.values).toContain("user-1");
		expect(batches[0]?.[1]?.values).toContain(123);
	});

	it("resolves a paper and logs the activity against it", async () => {
		const { database, statements } = createDatabase();
		const repository = createViewActivityRepository(database);

		await expect(repository.findPaperByArxivId("2607.00001")).resolves.toEqual({
			id: "paper-1",
		});
		await repository.recordPaperView("user-1", "paper-1", "read");

		const insert = statements.find((statement) =>
			statement.sql.startsWith('insert into "activity_events"'),
		);
		expect(insert?.values).toEqual([
			"user-1",
			"paper.read",
			"paper-1",
			"user-1",
		]);
	});
});
