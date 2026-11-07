/** Weekday, day, month and year of a UTC date, in English. */
const PARTS = new Intl.DateTimeFormat("en-GB", {
	weekday: "long",
	day: "numeric",
	month: "long",
	year: "numeric",
	timeZone: "UTC",
});

/** "Thursday 15 January", plus " 2026" when `withYear`; one format for every dateline. */
function dateline(day: Date, withYear: boolean): string {
	const part = (type: Intl.DateTimeFormatPartTypes) =>
		PARTS.formatToParts(day).find((p) => p.type === type)?.value ?? "";
	const text = `${part("weekday")} ${part("day")} ${part("month")}`;
	return withYear ? `${text} ${part("year")}` : text;
}

/** A "2026-01-15" edition date as "Thursday 15 January 2026"; "" if it isn't a date. */
export function formatEditionDate(isoDate: string): string {
	const day = new Date(`${isoDate}T00:00:00Z`);
	return Number.isNaN(day.getTime()) ? "" : dateline(day, true);
}

/** The reader's local today as "Saturday 7 November". */
export function formatToday(now: Date): string {
	return dateline(
		new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())),
		false,
	);
}
