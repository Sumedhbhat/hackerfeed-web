import "@tanstack/react-start/server-only";

import { logger } from "#/lib/logger";
import type { DatabaseContext } from "#/server/database/client";
import {
	fetchHackerNewsIngestionSnapshot,
	HACKER_NEWS_PER_FEED_LIMIT,
	HACKER_NEWS_SOURCE_BASE_URL,
	type HackerNewsIngestionSnapshot,
} from "./client";
import {
	createHackerNewsIngestionRepository,
	type HackerNewsIngestionRepository,
	type HackerNewsRunCounts,
} from "./repository";

const MAX_ERROR_MESSAGE_LENGTH = 1_000;

type IngestionOptions = {
	repository?: HackerNewsIngestionRepository;
	now?: () => Date;
	perFeedLimit?: number;
	fetchSnapshot?: () => Promise<HackerNewsIngestionSnapshot>;
};

export type HackerNewsIngestionResult = HackerNewsRunCounts & {
	runId: string;
	observedHour: string;
};

export function getHackerNewsObservationHour(scheduledTime: number): string {
	const date = new Date(scheduledTime);
	if (Number.isNaN(date.getTime())) {
		throw new Error("Invalid Hacker News scheduled time");
	}
	date.setUTCMinutes(0, 0, 0);
	return date.toISOString();
}

function errorMessage(error: unknown): string {
	return (error instanceof Error ? error.message : String(error)).slice(
		0,
		MAX_ERROR_MESSAGE_LENGTH,
	);
}

export async function runHackerNewsHourlyIngestion(
	database: DatabaseContext,
	scheduledTime: number,
	options: IngestionOptions = {},
): Promise<HackerNewsIngestionResult> {
	const repository =
		options.repository ?? createHackerNewsIngestionRepository(database);
	const now = options.now ?? (() => new Date());
	const perFeedLimit = options.perFeedLimit ?? HACKER_NEWS_PER_FEED_LIMIT;
	const fetchSnapshot =
		options.fetchSnapshot ??
		(() => fetchHackerNewsIngestionSnapshot({ perFeedLimit }));
	const observedHour = getHackerNewsObservationHour(scheduledTime);
	const startedAt = now();
	const runId = await repository.createRun({
		observedHour,
		startedAt: startedAt.toISOString(),
		sourceBaseUrl: HACKER_NEWS_SOURCE_BASE_URL,
		perFeedLimit,
	});

	logger.info("Hacker News ingestion started", {
		runId,
		observedHour,
		perFeedLimit,
	});

	try {
		const snapshot = await fetchSnapshot();
		logger.info("Hacker News feed lists and stories fetched", {
			runId,
			observedHour,
			topIds: snapshot.feedIdCounts.top,
			newIds: snapshot.feedIdCounts.new,
			bestIds: snapshot.feedIdCounts.best,
			uniqueSelected: snapshot.uniqueSelectedCount,
			fetched: snapshot.fetchedCount,
			skipped: snapshot.skippedCount,
		});

		const persisted = await repository.persistSnapshot(
			runId,
			observedHour,
			snapshot,
			now().toISOString(),
		);
		const counts: HackerNewsRunCounts = {
			topIds: snapshot.feedIdCounts.top,
			newIds: snapshot.feedIdCounts.new,
			bestIds: snapshot.feedIdCounts.best,
			uniqueSelected: snapshot.uniqueSelectedCount,
			fetched: snapshot.fetchedCount,
			skipped: snapshot.skippedCount,
			...persisted,
		};
		const finishedAt = now();
		await repository.finishRunSuccess(runId, finishedAt.toISOString(), counts);
		logger.info("Hacker News ingestion succeeded", {
			runId,
			observedHour,
			perFeedLimit,
			...counts,
			durationMs: finishedAt.getTime() - startedAt.getTime(),
			status: "success",
		});

		return { runId, observedHour, ...counts };
	} catch (error) {
		const finishedAt = now();
		const message = errorMessage(error);
		try {
			await repository.finishRunFailed(
				runId,
				finishedAt.toISOString(),
				message,
			);
		} catch (auditError) {
			logger.error("Failed to mark Hacker News ingestion run as failed", {
				runId,
				observedHour,
				err: errorMessage(auditError),
			});
		}
		logger.error("Hacker News ingestion failed", {
			runId,
			observedHour,
			perFeedLimit,
			durationMs: finishedAt.getTime() - startedAt.getTime(),
			status: "failed",
			err: message,
		});
		throw error;
	}
}
