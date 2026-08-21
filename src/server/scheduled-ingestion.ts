import "@tanstack/react-start/server-only";

import { logger } from "#/lib/logger";
import type { DatabaseContext } from "#/server/database/client";
import { runHackerNewsHourlyIngestion } from "./hacker-news-ingestion/ingestion";
import { runHuggingFaceDailyPapersIngestion } from "./huggingface-papers/ingestion";

export const HACKER_NEWS_HOURLY_CRON = "0 * * * *";
export const HUGGING_FACE_DAILY_CRON = "30 23 * * *";

type ScheduledJobs = {
	runHackerNews: (
		database: DatabaseContext,
		scheduledTime: number,
	) => Promise<unknown>;
	runHuggingFace: (database: DatabaseContext) => Promise<unknown>;
};

const scheduledJobs: ScheduledJobs = {
	runHackerNews: runHackerNewsHourlyIngestion,
	runHuggingFace: runHuggingFaceDailyPapersIngestion,
};

export function dispatchScheduledIngestion(
	cron: string,
	scheduledTime: number,
	database: DatabaseContext,
	jobs: ScheduledJobs = scheduledJobs,
): Promise<unknown> | undefined {
	if (cron === HACKER_NEWS_HOURLY_CRON) {
		return jobs.runHackerNews(database, scheduledTime);
	}
	if (cron === HUGGING_FACE_DAILY_CRON) {
		return jobs.runHuggingFace(database);
	}

	logger.warn("Unknown scheduled ingestion cron skipped", {
		cron,
		scheduledTime,
	});
	return undefined;
}
