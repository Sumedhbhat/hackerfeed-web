import type { ReadingDay } from "@hackerfeed/entities/analytics";

/** `YYYY-MM-DD` on the reader's own calendar. */
export function localDateKey(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${date.getFullYear()}-${month}-${day}`;
}

export function addDays(dateKey: string, days: number): string {
	const date = new Date(`${dateKey}T00:00:00Z`);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}

function weekday(dateKey: string): number {
	return new Date(`${dateKey}T00:00:00Z`).getUTCDay();
}

export function reads(day: ReadingDay): number {
	return day.stories + day.papers;
}

/**
 * The current streak counts back from today, or from yesterday while today has
 * no reads yet: the streak is still alive until the day ends.
 */
export function readingStreaks(days: ReadingDay[], today: string) {
	const active = new Set(days.map((day) => day.date));
	const readToday = active.has(today);

	let current = 0;
	for (
		let cursor = readToday ? today : addDays(today, -1);
		active.has(cursor);
		cursor = addDays(cursor, -1)
	) {
		current++;
	}

	let longest = 0;
	let run = 0;
	let previous: string | undefined;
	for (const { date } of days) {
		run = previous && addDays(previous, 1) === date ? run + 1 : 1;
		longest = Math.max(longest, run);
		previous = date;
	}

	return { current, longest, readToday };
}

/** One entry per day for the last `length` days, starting no earlier than the first day with reads. */
export function readingSeries(
	days: ReadingDay[],
	today: string,
	length: number,
): ReadingDay[] {
	const first = days[0]?.date;
	if (!first) return [];

	const byDate = new Map(days.map((day) => [day.date, day]));
	const windowStart = addDays(today, -(length - 1));
	const start = [first, windowStart].sort().at(-1) ?? windowStart;
	const series: ReadingDay[] = [];
	for (let date = start; date <= today; date = addDays(date, 1)) {
		series.push(byDate.get(date) ?? { date, stories: 0, papers: 0 });
	}
	return series;
}

export const MIN_CALENDAR_WEEKS = 17;
const MAX_CALENDAR_WEEKS = 53;

export type CalendarDay = { date: string; reading: ReadingDay | null };

/**
 * Week columns, Sunday first, ending with the week that holds today. Days
 * before the first read and after today have no `reading`. It spans the whole history,
 * at least {@link MIN_CALENDAR_WEEKS} and at most {@link MAX_CALENDAR_WEEKS}.
 */
export function readingCalendar(
	days: ReadingDay[],
	today: string,
): CalendarDay[][] {
	const first = days[0]?.date ?? today;
	const lastSunday = addDays(today, -weekday(today));
	const historyWeeks =
		Math.floor(
			(Date.parse(lastSunday) - Date.parse(addDays(first, -weekday(first)))) /
				(7 * 86_400_000),
		) + 1;
	const weeks = Math.min(
		MAX_CALENDAR_WEEKS,
		Math.max(MIN_CALENDAR_WEEKS, historyWeeks),
	);
	const byDate = new Map(days.map((day) => [day.date, day]));

	return Array.from({ length: weeks }, (_, week) =>
		Array.from({ length: 7 }, (_, dayOfWeek) => {
			const date = addDays(lastSunday, (week - weeks + 1) * 7 + dayOfWeek);
			if (date < first || date > today) return { date, reading: null };
			return {
				date,
				reading: byDate.get(date) ?? { date, stories: 0, papers: 0 },
			};
		}),
	);
}

const dayFormat = new Intl.DateTimeFormat(undefined, {
	weekday: "short",
	day: "numeric",
	month: "short",
	timeZone: "UTC",
});
const longDayFormat = new Intl.DateTimeFormat(undefined, {
	day: "numeric",
	month: "long",
	year: "numeric",
	timeZone: "UTC",
});
const monthFormat = new Intl.DateTimeFormat(undefined, {
	month: "short",
	timeZone: "UTC",
});

const asDate = (dateKey: string) => new Date(`${dateKey}T00:00:00Z`);

export const formatDay = (dateKey: string) => dayFormat.format(asDate(dateKey));
export const formatLongDay = (dateKey: string) =>
	longDayFormat.format(asDate(dateKey));
export const formatMonth = (dateKey: string) =>
	monthFormat.format(asDate(dateKey));

export function plural(count: number, one: string, many = `${one}s`) {
	return `${count} ${count === 1 ? one : many}`;
}

export function describeReads({ stories, papers }: ReadingDay): string {
	if (stories + papers === 0) return "Nothing read";
	return [
		stories > 0 && plural(stories, "story", "stories"),
		papers > 0 && plural(papers, "paper"),
	]
		.filter(Boolean)
		.join(", ");
}
