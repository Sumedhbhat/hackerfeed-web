import { Skeleton, usePlaceholder } from "@autoskeleton/react";
import type { ReadingDay } from "@hackerfeed/entities/analytics";
import { Button, ButtonLink } from "@hackerfeed/ui/atoms/Button";
import { PageContainer } from "@hackerfeed/ui/atoms/PageContainer";
import { Panel } from "@hackerfeed/ui/atoms/Panel";
import { Stack } from "@hackerfeed/ui/atoms/Stack";
import { EmptyState } from "@hackerfeed/ui/molecules/EmptyState";
import { PageHeader } from "@hackerfeed/ui/molecules/PageHeader";
import { useEffect, useState } from "react";
import { ReadingCalendar } from "#/components/organisms/analytics/ReadingCalendar";
import { ReadingStreak } from "#/components/organisms/analytics/ReadingStreak";
import { ReadingTrend } from "#/components/organisms/analytics/ReadingTrend";
import { useReadingDays } from "#/hooks/useReadingDays";
import { formatLongDay, localDateKey } from "#/lib/analytics/reading-days";

export function AnalyticsPage() {
	const { data: days, isError, refetch } = useReadingDays();
	const [today, setToday] = useState(() => localDateKey(new Date()));
	useEffect(() => {
		let timer: ReturnType<typeof setTimeout>;
		function refreshDate() {
			clearTimeout(timer);
			const now = new Date();
			setToday(localDateKey(now));
			const midnight = new Date(now);
			midnight.setHours(24, 0, 0, 0);
			timer = setTimeout(refreshDate, midnight.getTime() - now.getTime());
		}
		refreshDate();
		document.addEventListener("visibilitychange", refreshDate);
		return () => {
			clearTimeout(timer);
			document.removeEventListener("visibilitychange", refreshDate);
		};
	}, []);
	const since = days?.[0]?.date;
	const { data: shownDays, loading } = usePlaceholder(
		days,
		(): ReadingDay[] => [{ date: today, stories: 3, papers: 1 }],
	);

	return (
		<PageContainer>
			<Stack gap="section">
				<PageHeader
					title="Analytics"
					description={
						since
							? `Your reading since ${formatLongDay(since)}.`
							: "Your reading on HackerFeed."
					}
				/>
				{isError ? (
					<EmptyState
						title="Couldn't load your reading."
						headingSize="section"
						description="Check your connection and try again."
						action={
							<Button variant="secondary" onClick={() => refetch()}>
								Retry
							</Button>
						}
					/>
				) : shownDays.length === 0 ? (
					<EmptyState
						title="No reading yet"
						headingSize="section"
						description="Open a story or a paper and your streak starts today."
						action={<ButtonLink to="/">Browse stories</ButtonLink>}
					/>
				) : (
					<Skeleton loading={loading}>
						<ReadingStreak days={shownDays} today={today} />
						<Panel>
							<ReadingTrend days={shownDays} today={today} />
						</Panel>
						<Panel>
							<ReadingCalendar days={shownDays} today={today} />
						</Panel>
					</Skeleton>
				)}
			</Stack>
		</PageContainer>
	);
}
