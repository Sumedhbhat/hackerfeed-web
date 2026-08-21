import { describe, expect, it, vi } from "vitest";
import {
	createDatabaseContext,
	type D1DatabaseBinding,
} from "#/server/database/client";
import type { HackerNewsIngestionSnapshot } from "./client";
import { createHackerNewsIngestionRepository } from "./repository";

type CapturedStatement = { sql: string; values: unknown[] };

const observedHour = "2026-08-12T10:00:00.000Z";
const recordedAt = "2026-08-12T10:00:05.000Z";

function snapshot(
	overrides: Partial<
		HackerNewsIngestionSnapshot["stories"][number]["story"]
	> = {},
): HackerNewsIngestionSnapshot {
	return {
		feedIdCounts: { top: 1, new: 1, best: 0 },
		uniqueSelectedCount: 1,
		fetchedCount: 1,
		skippedCount: 0,
		stories: [
			{
				story: {
					availabilityStatus: "active",
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
					...overrides,
				},
				ranks: { topRank: 1, newRank: 1, bestRank: null },
			},
		],
	};
}

function createDatabase(
	options: { existingStory?: unknown[]; openVersion?: unknown[] } = {},
) {
	const batches: CapturedStatement[][] = [];
	const binding = {
		prepare(sql: string) {
			return {
				bind(...values: unknown[]) {
					return {
						sql,
						values,
						raw: vi
							.fn()
							.mockResolvedValue(
								sql.includes('from "hn_story_versions"')
									? options.openVersion
										? [options.openVersion]
										: []
									: options.existingStory
										? [options.existingStory]
										: [],
							),
						run: vi.fn().mockResolvedValue({ success: true }),
					};
				},
			};
		},
		batch(statements: CapturedStatement[]) {
			batches.push(statements);
			return Promise.resolve([]);
		},
	} as unknown as D1DatabaseBinding;

	return { batches, database: createDatabaseContext(binding) };
}

function existingStoryRow(): unknown[] {
	return [
		"existing-story-id",
		123,
		"Existing title",
		"https://example.com/existing",
		null,
		50,
		"2023-11-14T22:13:20.000Z",
		"alice",
		4,
		"[1,2,3]",
		"active",
		"2026-08-12T09:00:00.000Z",
		"2026-08-12T09:00:00.000Z",
	];
}

function openVersionRow(validFrom = "2026-08-12T09:00:00.000Z"): unknown[] {
	return [
		123,
		"open-version-id",
		"existing-story-id",
		"active",
		"Existing title",
		"https://example.com/existing",
		null,
		50,
		"2023-11-14T22:13:20.000Z",
		"alice",
		4,
		"[1,2,3]",
		validFrom,
	];
}

describe("Hacker News ingestion repository", () => {
	it("atomically inserts a canonical story, first version, and feed observation", async () => {
		const { batches, database } = createDatabase();
		const repository = createHackerNewsIngestionRepository(database);

		await expect(
			repository.persistSnapshot("run-1", observedHour, snapshot(), recordedAt),
		).resolves.toEqual({ stories: 1, versions: 1, feedObservations: 1 });

		expect(batches).toHaveLength(1);
		const sql = batches[0]?.map((statement) => statement.sql).join("\n") ?? "";
		expect(sql).toContain('insert into "stories"');
		expect(sql).toContain('insert into "hn_story_versions"');
		expect(sql).toContain('insert into "hn_story_feed_observations"');
		expect(batches[0]?.flatMap((statement) => statement.values)).toContain(
			`hn-version:123:${observedHour}`,
		);
	});

	it("preserves prior metadata when a later dead state omits it", async () => {
		const { batches, database } = createDatabase({
			existingStory: existingStoryRow(),
			openVersion: openVersionRow(),
		});
		const repository = createHackerNewsIngestionRepository(database);

		const counts = await repository.persistSnapshot(
			"run-2",
			observedHour,
			snapshot({
				availabilityStatus: "dead",
				by: null,
				descendants: null,
				kids: null,
				score: null,
				time: null,
				title: null,
				url: null,
			}),
			recordedAt,
		);

		expect(counts.versions).toBe(1);
		const statements = batches[0] ?? [];
		expect(
			statements.some((statement) =>
				statement.sql.startsWith('update "hn_story_versions"'),
			),
		).toBe(true);
		expect(
			statements.find((statement) =>
				statement.sql.startsWith('insert into "hn_story_versions"'),
			)?.values,
		).toEqual(
			expect.arrayContaining([
				"Existing title",
				"https://example.com/existing",
				50,
				"[1,2,3]",
			]),
		);
	});

	it("updates rather than duplicating a changed version on a same-hour retry", async () => {
		const { batches, database } = createDatabase({
			existingStory: existingStoryRow(),
			openVersion: openVersionRow(observedHour),
		});
		const repository = createHackerNewsIngestionRepository(database);

		const counts = await repository.persistSnapshot(
			"run-3",
			observedHour,
			snapshot({ score: 75 }),
			recordedAt,
		);

		expect(counts.versions).toBe(0);
		const sql = batches[0]?.map((statement) => statement.sql).join("\n") ?? "";
		expect(sql).toContain('update "hn_story_versions"');
		expect(sql).not.toContain('insert into "hn_story_versions"');
	});
});
