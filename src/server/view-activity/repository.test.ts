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
	it("atomically upserts a story and inserts a new view with server audit identity", async () => {
		const { batches, database } = createDatabase();
		const repository = createViewActivityRepository(database);

		await repository.recordStoryView("user-1", story());

		expect(batches).toHaveLength(1);
		expect(batches[0]).toHaveLength(2);
		expect(batches[0]?.[0]?.sql).toContain(
			'on conflict ("stories"."hnStoryId") do update',
		);
		expect(batches[0]?.[1]?.sql).toContain('insert into "story_views"');
		expect(batches[0]?.[1]?.sql).toContain(
			'select "stories"."id" from "stories" where "stories"."hnStoryId" = ?',
		);
		expect(batches[0]?.[1]?.values).toContain("user-1");
		expect(batches[0]?.[1]?.values).toContain(123);
	});

	it("resolves a paper and inserts a new view with a generated primary key", async () => {
		const { database, statements } = createDatabase();
		const repository = createViewActivityRepository(database);

		await expect(repository.findPaperByArxivId("2607.00001")).resolves.toEqual({
			id: "paper-1",
		});
		await repository.recordPaperView("user-1", "paper-1");

		const insert = statements.find((statement) =>
			statement.sql.startsWith('insert into "paper_views"'),
		);
		expect(insert?.values).toContain("user-1");
		expect(insert?.values).toContain("paper-1");
		expect(insert?.values[0]).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
		);
	});
});
