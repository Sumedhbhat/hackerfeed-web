export const DEMO_DATE = "2026-01-15";

/** `time` ("HH:MM:SS") on the demo day, as the ISO string ingestion writes. */
export const isoAt = (time: string) => `${DEMO_DATE}T${time}.000Z`;

/** `time` on the demo day, in SQLite's CURRENT_TIMESTAMP format. */
export const sqliteAt = (time: string) => `${DEMO_DATE} ${time}`;

export const unixAt = (time: string) => Date.parse(isoAt(time)) / 1000;

export const INGESTED_AT = isoAt("00:30:00");

export const ingestedTimestamps = {
	createdAt: INGESTED_AT,
	updatedAt: INGESTED_AT,
};

export const slugify = (text: string) =>
	text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
