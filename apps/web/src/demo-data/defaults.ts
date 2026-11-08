import papersSnapshot from "./snapshot/papers.json";

/** The day of the Hugging Face edition in the snapshot (see snapshot/). */
export const DEMO_DATE: string = papersSnapshot.editionDate;

/** `time` ("HH:MM:SS") on the demo day, as the ISO string ingestion writes. */
export const isoAt = (time: string) => `${DEMO_DATE}T${time}.000Z`;

/** `time` on the demo day, in SQLite's CURRENT_TIMESTAMP format. */
export const sqliteAt = (time: string) => `${DEMO_DATE} ${time}`;

export const INGESTED_AT = isoAt("00:30:00");

export const ingestedTimestamps = {
	createdAt: INGESTED_AT,
	updatedAt: INGESTED_AT,
};
