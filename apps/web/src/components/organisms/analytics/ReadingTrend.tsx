import type { ReadingDay } from "@hackerfeed/entities/analytics";
import { Heading } from "@hackerfeed/ui/atoms/Heading";
import { Row } from "@hackerfeed/ui/atoms/Row";
import { Stack } from "@hackerfeed/ui/atoms/Stack";
import { Text } from "@hackerfeed/ui/atoms/Text";
import { ToggleGroup, ToggleGroupItem } from "@hackerfeed/ui/atoms/Toggle";
import { DailyBarChart } from "@hackerfeed/ui/molecules/DailyBarChart";
import { useState } from "react";
import {
	describeReads,
	formatDay,
	formatLongDay,
	plural,
	readingSeries,
	reads,
} from "#/lib/analytics/reading-days";

const RANGES = ["7", "30", "90"] as const;
type Range = (typeof RANGES)[number];

export function ReadingTrend({
	days,
	today,
}: {
	days: ReadingDay[];
	today: string;
}) {
	const [range, setRange] = useState<Range>("30");
	const length = Number(range);
	const series = readingSeries(days, today, length);
	const stories = series.reduce((sum, day) => sum + day.stories, 0);
	const papers = series.reduce((sum, day) => sum + day.papers, 0);
	const activeDays = series.filter((day) => reads(day) > 0).length;
	const period =
		series.length < length && series[0]
			? `since ${formatLongDay(series[0].date)}`
			: `in the last ${length} days`;

	return (
		<Stack gap="section">
			<Row justify="between" wrap gap="md">
				<Heading level={2} size="section">
					Reading trend
				</Heading>
				<ToggleGroup
					layout="segmented"
					value={range}
					onValueChange={setRange}
					aria-label="Time range"
				>
					{RANGES.map((value) => (
						<ToggleGroupItem key={value} variant="segment" value={value}>
							{value} days
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			</Row>
			<Text as="output" tone="soft">
				{plural(stories, "story", "stories")} and {plural(papers, "paper")} on{" "}
				{plural(activeDays, "day")} {period}.
			</Text>
			<DailyBarChart
				caption={`Stories and papers read each day ${period}`}
				valueHeader="Read"
				bars={series.map((day) => ({
					key: day.date,
					label: formatDay(day.date),
					value: reads(day),
					description: describeReads(day),
				}))}
			/>
		</Stack>
	);
}
