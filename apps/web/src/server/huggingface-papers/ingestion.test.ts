import { describe, expect, it, vi } from "vitest";
import type { DatabaseContext } from "#/server/database/client";
import { runHuggingFaceDailyPapersIngestion } from "./ingestion";
import type { HuggingFaceDailyPaper } from "./schema";

function createRepository() {
	return {
		createRun: vi.fn().mockResolvedValue("run-1"),
		persistEdition: vi.fn().mockResolvedValue({
			papers: 1,
			authors: 2,
			organizations: 1,
			dailyEntries: 1,
		}),
		finishRunSuccess: vi.fn().mockResolvedValue(undefined),
		finishRunFailed: vi.fn().mockResolvedValue(undefined),
	};
}

const entries = [{ rank: 1 }] as HuggingFaceDailyPaper[];
const database = {} as DatabaseContext;
const fixedNow = () => new Date("2026-06-21T00:00:00.000Z");

describe("runHuggingFaceDailyPapersIngestion", () => {
	it("records, persists, and completes a successful run", async () => {
		const repository = createRepository();
		const fetchEdition = vi.fn().mockResolvedValue(entries);

		const result = await runHuggingFaceDailyPapersIngestion(database, {
			repository,
			now: fixedNow,
			fetchEdition,
		});

		expect(repository.createRun).toHaveBeenCalledWith({
			editionDate: "2026-06-20",
			startedAt: "2026-06-21T00:00:00.000Z",
			sourceUrl:
				"https://huggingface.co/api/daily_papers?date=2026-06-20&limit=100&sort=publishedAt",
		});
		expect(fetchEdition).toHaveBeenCalledWith("2026-06-20");
		expect(repository.persistEdition).toHaveBeenCalledWith(
			"2026-06-20",
			entries,
			"2026-06-21T00:00:00.000Z",
		);
		expect(repository.finishRunSuccess).toHaveBeenCalledWith(
			"run-1",
			"2026-06-21T00:00:00.000Z",
			1,
			{
				papers: 1,
				authors: 2,
				organizations: 1,
				dailyEntries: 1,
			},
		);
		expect(result).toEqual({
			runId: "run-1",
			editionDate: "2026-06-20",
			fetched: 1,
			papers: 1,
			authors: 2,
			organizations: 1,
			dailyEntries: 1,
		});
	});

	it("marks the audit run failed and preserves the original error", async () => {
		const repository = createRepository();
		repository.createRun.mockResolvedValue("run-2");
		const failure = new Error("invalid response");

		await expect(
			runHuggingFaceDailyPapersIngestion(database, {
				repository,
				now: fixedNow,
				fetchEdition: vi.fn().mockRejectedValue(failure),
			}),
		).rejects.toBe(failure);

		expect(repository.persistEdition).not.toHaveBeenCalled();
		expect(repository.finishRunSuccess).not.toHaveBeenCalled();
		expect(repository.finishRunFailed).toHaveBeenCalledWith(
			"run-2",
			"2026-06-21T00:00:00.000Z",
			"invalid response",
		);
	});
});
