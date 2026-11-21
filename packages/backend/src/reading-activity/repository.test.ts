/// <reference types="node" />
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { describe, expect, it } from "vitest";
import {
	createDatabaseContext,
	type D1DatabaseBinding,
} from "../database/client";
import { createReadingActivityRepository } from "./repository";

function withActivityDatabase(run: (sqlite: DatabaseSync) => Promise<void>) {
	const sqlite = new DatabaseSync(":memory:");
	sqlite.exec(`create table activity_events (
		id integer primary key, appUserId text, action text, storyId text,
		paperId text, occurredAt text, lastUpdatedDate text, lastUpdatedBy text
	)`);
	return run(sqlite).finally(() => sqlite.close());
}

function createRepository(sqlite: DatabaseSync) {
	const binding = {
		prepare(sql: string) {
			const statement = sqlite.prepare(sql);
			statement.setReturnArrays(true);
			return {
				bind(...values: SQLInputValue[]) {
					return { raw: async () => statement.all(...values) };
				},
			};
		},
	} as unknown as D1DatabaseBinding;
	return createReadingActivityRepository(createDatabaseContext(binding));
}

function insertReads(sqlite: DatabaseSync, count: number) {
	const insert = sqlite.prepare(`insert into activity_events
		(appUserId, action, storyId, paperId, occurredAt) values (?, ?, ?, ?, ?)`);
	for (let index = 0; index < count; index++) {
		insert.run("user-1", "story.read", "story-1", null, "2026-07-01 04:30:00");
	}
	return insert;
}

describe("reading activity repository", () => {
	it("uses the event's local day in each season and counts only this reader's distinct reads", () =>
		withActivityDatabase(async (sqlite) => {
			const insert = insertReads(sqlite, 2);
			insert.run(
				"user-1",
				"story.discussion_opened",
				"story-1",
				null,
				"2026-07-01 04:32:00",
			);
			insert.run(
				"user-1",
				"paper.read",
				null,
				"paper-1",
				"2026-07-01 04:35:00",
			);
			insert.run(
				"user-2",
				"paper.read",
				null,
				"paper-2",
				"2026-07-01 04:35:00",
			);
			insert.run(
				"user-1",
				"story.chat_opened",
				"story-2",
				null,
				"2026-07-01 04:35:00",
			);
			insert.run(
				"user-1",
				"story.read",
				"story-1",
				null,
				"2026-12-01 04:30:00",
			);

			await expect(
				createRepository(sqlite).listReadingDays("user-1", "America/New_York"),
			).resolves.toEqual([
				{ date: "2026-07-01", stories: 1, papers: 1 },
				{ date: "2026-11-30", stories: 1, papers: 0 },
			]);
		}));

	it("keeps reads at the same second across page boundaries", () =>
		withActivityDatabase(async (sqlite) => {
			const insert = insertReads(sqlite, 1000);
			insert.run(
				"user-1",
				"story.read",
				"story-2",
				null,
				"2026-07-01 04:30:00",
			);
			await expect(
				createRepository(sqlite).listReadingDays("user-1", "UTC"),
			).resolves.toEqual([{ date: "2026-07-01", stories: 2, papers: 0 }]);
		}));
});
