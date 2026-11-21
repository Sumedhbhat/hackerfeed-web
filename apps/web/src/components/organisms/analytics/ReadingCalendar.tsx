import type { ReadingDay } from "@hackerfeed/entities/analytics";
import { Heading } from "@hackerfeed/ui/atoms/Heading";
import { Stack } from "@hackerfeed/ui/atoms/Stack";
import {
	ActivityCalendar,
	type ActivityLevel,
} from "@hackerfeed/ui/molecules/ActivityCalendar";
import {
	describeReads,
	formatDay,
	formatLongDay,
	formatMonth,
	plural,
	readingCalendar,
	reads,
} from "#/lib/analytics/reading-days";

function level(count: number, max: number): ActivityLevel {
	if (count === 0) return 0;
	return Math.min(4, Math.ceil((count / max) * 4)) as ActivityLevel;
}

export function ReadingCalendar({
	days,
	today,
}: {
	days: ReadingDay[];
	today: string;
}) {
	const weeks = readingCalendar(days, today);
	const shown = weeks
		.flat()
		.flatMap((day) => (day.reading ? [day.reading] : []));
	const max = Math.max(1, ...shown.map(reads));
	const readDays = shown.filter((day) => reads(day) > 0);
	const activeDays = readDays.length;

	return (
		<Stack gap="section">
			<Heading level={2} size="section">
				Reading calendar
			</Heading>
			<ActivityCalendar
				listingLabel="Days with reads"
				listing={[...readDays].reverse().map((day) => ({
					key: day.date,
					day: formatLongDay(day.date),
					description: describeReads(day),
				}))}
				label={`You read on ${plural(activeDays, "day")} of the last ${plural(shown.length, "day")}.`}
				weeks={weeks.map((week) => {
					const firstOfMonth = week.find(({ date }) => date.endsWith("-01"));
					return {
						key: week[0].date,
						month: firstOfMonth ? formatMonth(firstOfMonth.date) : null,
						days: week.map(({ date, reading }) => ({
							key: date,
							level: reading ? level(reads(reading), max) : null,
							description: reading
								? `${formatDay(date)}: ${describeReads(reading)}`
								: undefined,
						})),
					};
				})}
			/>
		</Stack>
	);
}
