import { describe, expect, it } from "vitest";
import {
	createDatabaseContext,
	type D1DatabaseBinding,
} from "../database/client";
import { createReadingActivityRepository } from "./repository";

function createDatabase(rows: unknown[][]) {
	const statements: Array<{ sql: string; values: unknown[] }> = [];
	const binding = {
		prepare(sql: string) {
			return {
				bind(...values: unknown[]) {
					statements.push({ sql, values });
					return { raw: async () => rows };
				},
			};
		},
	} as unknown as D1DatabaseBinding;

	return { database: createDatabaseContext(binding), statements };
}

describe("reading activity repository", () => {
	it("counts distinct stories and papers read on each of the reader's local days", async () => {
		const { database, statements } = createDatabase([
			["2026-11-19", 3, 0],
			["2026-11-20", 1, 2],
		]);

		await expect(
			createReadingActivityRepository(database).listReadingDays("user-1", 330),
		).resolves.toEqual([
			{ date: "2026-11-19", stories: 3, papers: 0 },
			{ date: "2026-11-20", stories: 1, papers: 2 },
		]);

		const [query] = statements;
		expect(query?.sql).toContain(
			'count(distinct case when "activity_events"."action" in (?, ?) then "storyId" end)',
		);
		expect(query?.sql).toContain(
			'group by date("activity_events"."occurredAt", ?) order by date("activity_events"."occurredAt", ?)',
		);
		expect(query?.values).toContain("user-1");
		expect(query?.values).toContain("330 minutes");
		expect(query?.values).toContain("paper.read");
	});
});
