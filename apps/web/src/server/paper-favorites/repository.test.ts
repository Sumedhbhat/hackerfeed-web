import { describe, expect, it } from "vitest";
import {
	createDatabaseContext,
	type D1DatabaseBinding,
} from "#/server/database/client";
import { createPaperFavoriteRepository } from "./repository";

type CapturedStatement = { sql: string; values: unknown[] };

function createDatabase() {
	const statements: CapturedStatement[] = [];
	const batches: CapturedStatement[][] = [];
	const binding = {
		prepare(sql: string) {
			return {
				bind(...values: unknown[]) {
					statements.push({ sql, values });
					return {
						sql,
						values,
						async run() {
							return { success: true };
						},
						async raw() {
							if (
								sql.includes('from "paper_favorites" inner join "hf_papers"')
							) {
								return [
									[
										"favorite-002",
										"2026-07-10 12:00:00",
										"paper-002",
										"2607.00002",
										"Newer paper",
										"Original abstract",
										"AI summary",
										"2026-07-02T00:00:00.000Z",
										12,
										"https://example.com/project",
										"https://github.com/example/repo",
									],
									[
										"favorite-001",
										"2026-07-10 12:00:00",
										"paper-001",
										"2607.00001",
										"Older paper",
										"Summary",
										null,
										"2026-07-01T00:00:00.000Z",
										5,
										null,
										null,
									],
								];
							}

							if (sql.includes('from "paper_favorites" where')) {
								return [
									[
										"favorite-001",
										"user-1",
										"paper-001",
										"2026-07-10 12:00:00",
									],
								];
							}

							if (sql.includes('from "hf_paper_authors"')) {
								return [
									["paper-002", "Ada Lovelace", 1],
									["paper-002", "Grace Hopper", 2],
								];
							}

							if (sql.includes('from "hf_paper_keywords"')) {
								return [["paper-002", "agents", 1]];
							}

							return [];
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

	return { batches, database: createDatabaseContext(binding), statements };
}

describe("paper favorite repository", () => {
	it("uses deterministic keyset pagination and returns raw paper metadata", async () => {
		const { database, statements } = createDatabase();
		const repository = createPaperFavoriteRepository(database);

		const page = await repository.listFavorites("user-1", 1, {
			createdAt: "2026-07-11 00:00:00",
			id: "favorite-999",
		});

		expect(page).toEqual({
			items: [
				{
					aiSummary: "AI summary",
					arxivId: "2607.00002",
					authors: ["Ada Lovelace", "Grace Hopper"],
					githubRepo: "https://github.com/example/repo",
					keywords: ["agents"],
					paperPublishedAt: "2026-07-02T00:00:00.000Z",
					projectPage: "https://example.com/project",
					savedAt: "2026-07-10 12:00:00",
					summary: "Original abstract",
					title: "Newer paper",
					upvotes: 12,
				},
			],
			nextCursor: {
				createdAt: "2026-07-10 12:00:00",
				id: "favorite-002",
			},
		});

		const listStatement = statements[0];
		expect(listStatement?.values).toContain("user-1");
		expect(listStatement?.values).toContain("2026-07-11 00:00:00");
		expect(listStatement?.values).toContain("favorite-999");
		expect(listStatement?.values).toContain(2);
		expect(listStatement?.sql).toContain(
			'order by "paper_favorites"."createdAt" desc, "paper_favorites"."id" desc',
		);
	});

	it("scopes remove and clear deletes to the app user and logs each removal", async () => {
		const { batches, database } = createDatabase();
		const repository = createPaperFavoriteRepository(database);

		await repository.removeFavorite("user-1", "2607.00001");
		await repository.clearFavorites("user-1");

		expect(batches).toHaveLength(2);
		for (const [logRemoval, deleteFavorites] of batches) {
			expect(logRemoval?.sql).toMatch(
				/^insert into "activity_events" .* from "paper_favorites" where/,
			);
			expect(logRemoval?.values).toContain("paper.unfavorited");
			expect(deleteFavorites?.sql).toMatch(/^delete from "paper_favorites"/);
		}
		expect(batches[0]?.[1]?.values).toEqual(["user-1", "2607.00001"]);
		expect(batches[1]?.[1]?.values).toEqual(["user-1"]);
	});

	it("logs a favorite only when the paper was not already saved", async () => {
		const { batches, database } = createDatabase();
		const repository = createPaperFavoriteRepository(database);

		await expect(
			repository.addFavorite("user-1", "paper-001"),
		).resolves.toMatchObject({ id: "favorite-001" });

		expect(batches[0]?.[0]?.sql).toContain('insert into "activity_events"');
		expect(batches[0]?.[0]?.sql).toContain(
			'not exists (select "id" from "paper_favorites"',
		);
		expect(batches[0]?.[0]?.values).toContain("paper.favorited");
		expect(batches[0]?.[1]?.sql).toContain('insert into "paper_favorites"');
	});
});
