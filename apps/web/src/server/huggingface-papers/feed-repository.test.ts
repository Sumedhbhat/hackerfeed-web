import { describe, expect, it } from "vitest";
import {
	createDatabaseContext,
	type D1DatabaseBinding,
} from "#/server/database/client";
import { createHuggingFacePaperFeedRepository } from "./feed-repository";

type Run = {
	editionDate: string;
	startedAt: string;
	status: "failed" | "success";
};

function createDatabase(runs: Run[]) {
	const statements: Array<{ sql: string; values: unknown[] }> = [];
	const binding = {
		prepare(sql: string) {
			return {
				bind(...values: unknown[]) {
					statements.push({ sql, values });
					return {
						async raw() {
							const status = values.find(
								(value) => value === "failed" || value === "success",
							);
							const requestedDate = values.find(
								(value) =>
									typeof value === "string" &&
									/^\d{4}-\d{2}-\d{2}$/.test(value),
							);
							const [run] = runs
								.filter(
									(candidate) =>
										candidate.status === status &&
										(!requestedDate || candidate.editionDate === requestedDate),
								)
								.sort(
									(left, right) =>
										right.editionDate.localeCompare(left.editionDate) ||
										right.startedAt.localeCompare(left.startedAt),
								);

							return run ? [[run.editionDate]] : [];
						},
					};
				},
			};
		},
	} as unknown as D1DatabaseBinding;

	return { database: createDatabaseContext(binding), statements };
}

describe("Hugging Face paper feed repository", () => {
	it("falls back to the latest successful edition when the newest run failed", async () => {
		const { database, statements } = createDatabase([
			{
				editionDate: "2026-06-21",
				startedAt: "2026-06-22T00:00:00.000Z",
				status: "failed",
			},
			{
				editionDate: "2026-06-20",
				startedAt: "2026-06-21T00:00:00.000Z",
				status: "success",
			},
		]);
		const repository = createHuggingFacePaperFeedRepository(database);

		await expect(repository.findEditionDate()).resolves.toBe("2026-06-20");
		expect(statements[0]?.values).toContain("success");
		expect(statements[0]?.sql).toContain(
			'"hf_ingestion_runs"."editionDate" desc',
		);
	});

	it("does not serve a requested date without a successful run", async () => {
		const { database } = createDatabase([
			{
				editionDate: "2026-06-21",
				startedAt: "2026-06-22T00:00:00.000Z",
				status: "failed",
			},
		]);
		const repository = createHuggingFacePaperFeedRepository(database);

		await expect(repository.findEditionDate("2026-06-21")).resolves.toBeNull();
	});
});
