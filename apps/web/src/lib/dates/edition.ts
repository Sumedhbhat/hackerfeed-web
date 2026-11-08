const PARTS = new Intl.DateTimeFormat("en-GB", {
	weekday: "long",
	day: "numeric",
	month: "long",
	year: "numeric",
	timeZone: "UTC",
});

function dateline(day: Date, withYear: boolean): string {
	const part = (type: Intl.DateTimeFormatPartTypes) =>
		PARTS.formatToParts(day).find((p) => p.type === type)?.value ?? "";
	const text = `${part("weekday")} ${part("day")} ${part("month")}`;
	return withYear ? `${text} ${part("year")}` : text;
}

export function formatEditionDate(isoDate: string): string {
	const day = new Date(`${isoDate}T00:00:00Z`);
	return Number.isNaN(day.getTime()) ? "" : dateline(day, true);
}
