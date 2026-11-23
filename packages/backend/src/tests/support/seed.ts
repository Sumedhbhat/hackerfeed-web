import type { DatabaseContext } from "../../database/client";
import { runHuggingFaceDailyPapersIngestion } from "../../huggingface-papers/ingestion";
import type { DailyPapersEntry } from "./data";
import type { createFakeHuggingFace } from "./external-services";

const DAY_MS = 86_400_000;

/** When the nightly job runs to ingest this edition (India's next morning). */
export function nightlyRunFor(editionDate: string): Date {
	return new Date(Date.parse(`${editionDate}T00:00:00.000Z`) + DAY_MS);
}

/**
 * Puts papers in the database the way production does: Hugging Face
 * publishes the edition and the nightly job ingests it.
 */
export function ingestEdition(
	{
		database,
		huggingFace,
	}: {
		database: DatabaseContext;
		huggingFace: ReturnType<typeof createFakeHuggingFace>;
	},
	editionDate: string,
	entries?: DailyPapersEntry[],
) {
	if (entries) huggingFace.publish(editionDate, entries);
	return runHuggingFaceDailyPapersIngestion(database, {
		now: () => nightlyRunFor(editionDate),
	});
}
