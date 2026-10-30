import { describe, expect, it } from "vitest";
import {
	createDatabaseContext,
	type D1DatabaseBinding,
} from "#/server/database/client";
import { createFavoriteRepository } from "./repository";

type CapturedStatement = { sql: string; values: unknown[] };

function createBatchingDatabase() {
	const batches: CapturedStatement[][] = [];
	const binding = {
		prepare(sql: string) {
			return {
				bind(...values: unknown[]) {
					return {
						sql,
						values,
						async raw() {
							return sql.includes('from "favorites" where')
								? [["favorite-1", "user-1", "story-1", "2026-07-10 12:00:00"]]
								: [];
						},
					};
				},
			};
		},
		async batch(batch: CapturedStatement[]) {
			batches.push(batch);
			return [];
		},
	} as unknown as D1DatabaseBinding;

	return {
		batches,
		repository: createFavoriteRepository(createDatabaseContext(binding)),
	};
}

describe("favorite repository", () => {
	it("orders equal-time favorites by descending ID", async () => {
		const statements: Array<{ sql: string; values: unknown[] }> = [];
		const binding = {
			prepare(sql: string) {
				return {
					bind(...values: unknown[]) {
						statements.push({ sql, values });
						return { raw: async () => [] };
					},
				};
			},
		} as unknown as D1DatabaseBinding;
		const repository = createFavoriteRepository(createDatabaseContext(binding));

		await repository.listFavorites("user-1");

		expect(statements[0]?.values).toContain("user-1");
		expect(statements[0]?.sql).toContain(
			'order by "favorites"."createdAt" desc, "favorites"."id" desc',
		);
	});

	it("logs a favorite only when the story was not already saved", async () => {
		const { batches, repository } = createBatchingDatabase();

		await expect(
			repository.addFavorite("user-1", "story-1"),
		).resolves.toMatchObject({ id: "favorite-1" });

		const [logFavorite, insertFavorite] = batches[0] ?? [];
		expect(logFavorite?.sql).toContain('insert into "activity_events"');
		expect(logFavorite?.sql).toContain(
			'not exists (select "id" from "favorites"',
		);
		expect(logFavorite?.values).toContain("story.favorited");
		expect(insertFavorite?.sql).toContain('insert into "favorites"');
	});

	it("logs each removal in the same batch as the delete", async () => {
		const { batches, repository } = createBatchingDatabase();

		await repository.removeFavorite("user-1", 123);
		await repository.clearFavorites("user-1");

		expect(batches).toHaveLength(2);
		for (const [logRemoval, deleteFavorites] of batches) {
			expect(logRemoval?.sql).toMatch(
				/^insert into "activity_events" .* from "favorites" where/,
			);
			expect(logRemoval?.values).toContain("story.unfavorited");
			expect(deleteFavorites?.sql).toMatch(/^delete from "favorites"/);
		}
		expect(batches[0]?.[1]?.values).toEqual(["user-1", 123]);
		expect(batches[1]?.[1]?.values).toEqual(["user-1"]);
	});
});
