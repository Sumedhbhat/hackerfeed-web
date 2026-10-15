import { afterEach, describe, expect, it, vi } from "vitest";
import type { DatabaseContext } from "#/server/database/client";
import type { HackerNewsIngestionSnapshot } from "./client";
import {
	getHackerNewsObservationHour,
	runHackerNewsHourlyIngestion,
} from "./ingestion";

const database = {} as DatabaseContext;
const scheduledTime = Date.parse("2026-08-12T10:37:45.000Z");
const now = () => new Date("2026-08-12T10:40:00.000Z");
const snapshot: HackerNewsIngestionSnapshot = {
	feedIdCounts: { top: 2, new: 1, best: 1 },
	uniqueSelectedCount: 2,
	fetchedCount: 2,
	skippedCount: 1,
	stories: [],
};

function createRepository() {
	return {
		createRun: vi.fn().mockResolvedValue("run-1"),
		persistSnapshot: vi.fn().mockResolvedValue({
			stories: 1,
			versions: 1,
			feedObservations: 1,
		}),
		finishRunSuccess: vi.fn().mockResolvedValue(undefined),
		finishRunFailed: vi.fn().mockResolvedValue(undefined),
	};
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe("runHackerNewsHourlyIngestion", () => {
	it("derives a deterministic UTC observation hour", () => {
		expect(getHackerNewsObservationHour(scheduledTime)).toBe(
			"2026-08-12T10:00:00.000Z",
		);
		expect(() => getHackerNewsObservationHour(Number.NaN)).toThrow(
			"Invalid Hacker News scheduled time",
		);
	});

	it("records, persists, and completes a successful hourly run", async () => {
		vi.spyOn(console, "log").mockImplementation(() => undefined);
		const repository = createRepository();

		const result = await runHackerNewsHourlyIngestion(database, scheduledTime, {
			repository,
			now,
			perFeedLimit: 25,
			fetchSnapshot: vi.fn().mockResolvedValue(snapshot),
		});

		expect(repository.createRun).toHaveBeenCalledWith({
			observedHour: "2026-08-12T10:00:00.000Z",
			startedAt: "2026-08-12T10:40:00.000Z",
			sourceBaseUrl: "https://hacker-news.firebaseio.com/v0",
			perFeedLimit: 25,
		});
		expect(repository.persistSnapshot).toHaveBeenCalledWith(
			"run-1",
			"2026-08-12T10:00:00.000Z",
			snapshot,
			"2026-08-12T10:40:00.000Z",
		);
		expect(repository.finishRunSuccess).toHaveBeenCalledWith(
			"run-1",
			"2026-08-12T10:40:00.000Z",
			{
				topIds: 2,
				newIds: 1,
				bestIds: 1,
				uniqueSelected: 2,
				fetched: 2,
				skipped: 1,
				stories: 1,
				versions: 1,
				feedObservations: 1,
			},
		);
		expect(result.runId).toBe("run-1");
	});

	it("marks a failed run and preserves the original failure", async () => {
		vi.spyOn(console, "log").mockImplementation(() => undefined);
		vi.spyOn(console, "error").mockImplementation(() => undefined);
		const repository = createRepository();
		const failure = new Error("network unavailable");

		await expect(
			runHackerNewsHourlyIngestion(database, scheduledTime, {
				repository,
				now,
				fetchSnapshot: vi.fn().mockRejectedValue(failure),
			}),
		).rejects.toBe(failure);
		expect(repository.persistSnapshot).not.toHaveBeenCalled();
		expect(repository.finishRunSuccess).not.toHaveBeenCalled();
		expect(repository.finishRunFailed).toHaveBeenCalledWith(
			"run-1",
			"2026-08-12T10:40:00.000Z",
			"network unavailable",
		);
	});
});
