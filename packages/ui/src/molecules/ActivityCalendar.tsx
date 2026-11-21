import type { CSSProperties } from "react";

export type ActivityLevel = 0 | 1 | 2 | 3 | 4;

export type ActivityDay = {
	key: string;
	/** null leaves the day blank: before the history starts, or after today. */
	level: ActivityLevel | null;
	/** Shown on hover, e.g. "Sat 21 Nov: 3 stories, 1 paper". */
	description?: string;
};

export type ActivityWeek = {
	key: string;
	/** The month that starts in this column, if any. */
	month: string | null;
	/** Sunday first. */
	days: ActivityDay[];
};

const LEVEL: Record<ActivityLevel, string> = {
	0: "bg-muted-line/60",
	1: "bg-accent/30",
	2: "bg-accent/55",
	3: "bg-accent/80",
	4: "bg-accent",
};

/** Phones show the last 17 weeks, tablets 30, and wider screens all of them. */
function columnVisibility(weeksAgo: number) {
	if (weeksAgo >= 30) return "hidden lg:block";
	if (weeksAgo >= 17) return "hidden sm:block";
	return "";
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * A grid of days like a contribution graph: one column per week, Sunday at the
 * top, darker for busier days. `label` is what assistive technology reads.
 */
export function ActivityCalendar({
	weeks,
	label,
	lessLabel = "Less",
	moreLabel = "More",
}: {
	weeks: ActivityWeek[];
	label: string;
	lessLabel?: string;
	moreLabel?: string;
}) {
	const visibility = new Map(
		weeks.map((week, index) => [
			week.key,
			columnVisibility(weeks.length - 1 - index),
		]),
	);

	return (
		<div className="flex flex-col gap-3">
			<div
				role="img"
				aria-label={label}
				className="grid grid-cols-[auto_repeat(var(--weeks-phone),minmax(0,0.875rem))] gap-[3px] sm:grid-cols-[auto_repeat(var(--weeks-tablet),minmax(0,0.875rem))] lg:grid-cols-[auto_repeat(var(--weeks),minmax(0,0.875rem))]"
				style={
					{
						"--weeks-phone": Math.min(17, weeks.length),
						"--weeks-tablet": Math.min(30, weeks.length),
						"--weeks": weeks.length,
					} as CSSProperties
				}
			>
				<span />
				{weeks.map((week) => (
					<span
						key={week.key}
						className={`h-5 overflow-visible whitespace-nowrap text-meta text-ink-soft ${visibility.get(week.key)}`}
					>
						{week.month}
					</span>
				))}
				{WEEKDAYS.map((weekday, dayOfWeek) => [
					<span
						key={weekday}
						className="pr-1 text-meta leading-none text-ink-soft"
					>
						{dayOfWeek % 2 === 1 ? weekday : null}
					</span>,
					...weeks.map((week) => {
						const day = week.days[dayOfWeek];
						if (!day) return null;
						return (
							<span
								key={day.key}
								title={day.description}
								className={`aspect-square rounded-[3px] ${day.level === null ? "" : LEVEL[day.level]} ${visibility.get(week.key)}`}
							/>
						);
					}),
				])}
			</div>
			<div
				aria-hidden="true"
				className="flex items-center justify-end gap-[3px] text-meta text-ink-soft"
			>
				<span className="mr-1">{lessLabel}</span>
				{([0, 1, 2, 3, 4] as const).map((level) => (
					<span
						key={level}
						className={`size-3 rounded-[3px] ${LEVEL[level]}`}
					/>
				))}
				<span className="ml-1">{moreLabel}</span>
			</div>
		</div>
	);
}
