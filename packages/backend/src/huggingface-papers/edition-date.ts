const INDIA_TIME_ZONE = "Asia/Kolkata";

const indiaDateFormatter = new Intl.DateTimeFormat("en-US", {
	day: "2-digit",
	month: "2-digit",
	timeZone: INDIA_TIME_ZONE,
	year: "numeric",
});

export function getPreviousIndiaEditionDate(now = new Date()): string {
	const parts = Object.fromEntries(
		indiaDateFormatter
			.formatToParts(now)
			.filter(({ type }) => type !== "literal")
			.map(({ type, value }) => [type, Number(value)]),
	);
	const indiaCalendarDate = new Date(
		Date.UTC(parts.year, parts.month - 1, parts.day),
	);
	indiaCalendarDate.setUTCDate(indiaCalendarDate.getUTCDate() - 1);

	return indiaCalendarDate.toISOString().slice(0, 10);
}
