import { afterEach, describe, expect, it, vi } from "vitest";
import type { DatabaseContext } from "#/server/database/client";
import {
	dispatchScheduledIngestion,
	HACKER_NEWS_HOURLY_CRON,
	HUGGING_FACE_DAILY_CRON,
} from "./scheduled-ingestion";

const database = {} as DatabaseContext;
const scheduledTime = Date.parse("2026-08-12T10:00:00.000Z");

function createJobs() {
	return {
		runHackerNews: vi.fn().mockResolvedValue("hn"),
		runHuggingFace: vi.fn().mockResolvedValue("papers"),
	};
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe("scheduled ingestion dispatch", () => {
	it("runs only Hacker News for the hourly cron", async () => {
		const jobs = createJobs();

		await expect(
			dispatchScheduledIngestion(
				HACKER_NEWS_HOURLY_CRON,
				scheduledTime,
				database,
				jobs,
			),
		).resolves.toBe("hn");
		expect(jobs.runHackerNews).toHaveBeenCalledWith(database, scheduledTime);
		expect(jobs.runHuggingFace).not.toHaveBeenCalled();
	});

	it("runs only papers for the daily cron", async () => {
		const jobs = createJobs();

		await expect(
			dispatchScheduledIngestion(
				HUGGING_FACE_DAILY_CRON,
				scheduledTime,
				database,
				jobs,
			),
		).resolves.toBe("papers");
		expect(jobs.runHuggingFace).toHaveBeenCalledWith(database);
		expect(jobs.runHackerNews).not.toHaveBeenCalled();
	});

	it("skips unknown cron expressions", () => {
		vi.spyOn(console, "warn").mockImplementation(() => undefined);
		const jobs = createJobs();

		expect(
			dispatchScheduledIngestion("5 * * * *", scheduledTime, database, jobs),
		).toBeUndefined();
		expect(jobs.runHackerNews).not.toHaveBeenCalled();
		expect(jobs.runHuggingFace).not.toHaveBeenCalled();
	});
});
