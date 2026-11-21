import { type CSSProperties, useState } from "react";
import {
	Collapsible,
	CollapsiblePanel,
	CollapsibleTrigger,
} from "../atoms/Collapsible";

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

export type ActivityListing = {
	key: string;
	day: string;
	description: string;
};

/**
 * A grid of days like a contribution graph: one column per week, Sunday at the
 * top, darker for busier days. The grid is only a picture; `listing` holds the
 * same days as text behind a button, so keyboard and screen reader users get
 * every day's details. `label` summarises the picture.
 */
export function ActivityCalendar({
	weeks,
	label,
	listing,
	listingLabel,
}: {
	weeks: ActivityWeek[];
	label: string;
	/** The days worth listing, newest first. */
	listing: ActivityListing[];
	/** Names the listing, e.g. "Days with reads". */
	listingLabel: string;
}) {
	const [listingOpen, setListingOpen] = useState(false);
	const visibility = new Map(
		weeks.map((week, index) => [
			week.key,
			columnVisibility(weeks.length - 1 - index),
		]),
	);

	return (
		<div className="flex w-fit max-w-full flex-col gap-3">
			<p className="sr-only">{label}</p>
			<div
				aria-hidden="true"
				className="grid w-fit max-w-full grid-cols-[auto_repeat(var(--weeks-phone),minmax(0,1rem))] gap-[3px] sm:grid-cols-[auto_repeat(var(--weeks-tablet),minmax(0,1rem))] lg:grid-cols-[auto_repeat(var(--weeks),minmax(0,1rem))]"
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
				<span className="mr-1">Less</span>
				{([0, 1, 2, 3, 4] as const).map((level) => (
					<span
						key={level}
						className={`size-3 rounded-[3px] ${LEVEL[level]}`}
					/>
				))}
				<span className="ml-1">More</span>
			</div>
			<Collapsible open={listingOpen} onOpenChange={setListingOpen}>
				<CollapsibleTrigger variant="secondary">
					{listingOpen ? "Hide" : "Show"} {listingLabel.toLowerCase()}
				</CollapsibleTrigger>
				<CollapsiblePanel>
					<table className="mt-3 w-full text-left text-sm">
						<caption className="sr-only">{listingLabel}</caption>
						<thead className="text-ink-soft">
							<tr>
								<th scope="col" className="py-1 pr-4 font-medium">
									Day
								</th>
								<th scope="col" className="py-1 font-medium">
									Read
								</th>
							</tr>
						</thead>
						<tbody>
							{listing.map((row) => (
								<tr key={row.key} className="border-t border-line">
									<th scope="row" className="py-1.5 pr-4 font-normal">
										{row.day}
									</th>
									<td className="py-1.5">{row.description}</td>
								</tr>
							))}
						</tbody>
					</table>
				</CollapsiblePanel>
			</Collapsible>
		</div>
	);
}
