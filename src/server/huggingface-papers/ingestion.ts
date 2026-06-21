import "@tanstack/react-start/server-only";

import type { DatabaseContext } from "#/server/database/client";
import { fetchHuggingFaceDailyPapersEdition } from "./client";
import { getPreviousIndiaEditionDate } from "./edition-date";
import {
	createHuggingFaceIngestionRepository,
	type HuggingFaceIngestionRepository,
	type IngestionCounts,
} from "./ingestion-repository";
import type { HuggingFaceDailyPaper } from "./schema";

const LIMIT = 100;
const SORT = "publishedAt";
const SOURCE_URL = "https://huggingface.co/api/daily_papers";

type IngestionOptions = {
	repository?: HuggingFaceIngestionRepository;
	now?: () => Date;
	fetchEdition?: (editionDate: string) => Promise<HuggingFaceDailyPaper[]>;
};

export type IngestionResult = IngestionCounts & {
	runId: string;
	editionDate: string;
	fetched: number;
};

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function sourceUrl(editionDate: string): string {
	const url = new URL(SOURCE_URL);
	url.searchParams.set("date", editionDate);
	url.searchParams.set("limit", String(LIMIT));
	url.searchParams.set("sort", SORT);
	return url.toString();
}

export async function runHuggingFaceDailyPapersIngestion(
	database: DatabaseContext,
	options: IngestionOptions = {},
): Promise<IngestionResult> {
	const repository =
		options.repository ?? createHuggingFaceIngestionRepository(database);
	const now = options.now ?? (() => new Date());
	const fetchEdition =
		options.fetchEdition ?? fetchHuggingFaceDailyPapersEdition;
	const editionDate = getPreviousIndiaEditionDate(now());
	const startedAt = now().toISOString();

	const runId = await repository.createRun({
		editionDate,
		startedAt,
		sourceUrl: sourceUrl(editionDate),
	});

	try {
		const entries = await fetchEdition(editionDate);
		const persistedAt = now().toISOString();
		const counts = await repository.persistEdition(
			editionDate,
			entries,
			persistedAt,
		);
		await repository.finishRunSuccess(
			runId,
			now().toISOString(),
			entries.length,
			counts,
		);

		return {
			...counts,
			runId,
			editionDate,
			fetched: entries.length,
		};
	} catch (error) {
		try {
			await repository.finishRunFailed(
				runId,
				now().toISOString(),
				errorMessage(error),
			);
		} catch (auditError) {
			console.error(
				"Failed to mark Hugging Face ingestion run as failed",
				auditError,
			);
		}
		throw error;
	}
}
