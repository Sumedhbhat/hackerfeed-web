import type { ReadingDay } from "@hackerfeed/entities/analytics";
import { Row } from "@hackerfeed/ui/atoms/Row";
import { StatTile } from "@hackerfeed/ui/molecules/StatTile";
import { BookOpen, Flame, Trophy } from "lucide-react";
import {
	describeReads,
	plural,
	readingStreaks,
} from "#/lib/analytics/reading-days";

export function ReadingStreak({
	days,
	today,
}: {
	days: ReadingDay[];
	today: string;
}) {
	const { current, longest, readToday } = readingStreaks(days, today);
	const todays = days.find((day) => day.date === today);

	return (
		<Row gap="md" wrap align="stretch">
			<StatTile
				icon={Flame}
				highlight={readToday}
				label="Current streak"
				value={plural(current, "day")}
				detail={
					readToday
						? "You've read today. Keep it going tomorrow."
						: current > 0
							? "Read something today to keep it going."
							: "Read a story or paper to start one."
				}
			/>
			<StatTile
				icon={Trophy}
				label="Longest streak"
				value={plural(longest, "day")}
			/>
			<StatTile
				icon={BookOpen}
				label="Today"
				value={
					todays ? plural(todays.stories + todays.papers, "read") : "None yet"
				}
				detail={todays ? describeReads(todays) : undefined}
			/>
		</Row>
	);
}
