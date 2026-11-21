import { Button, ButtonLink } from "@hackerfeed/ui/atoms/Button";
import { PageContainer } from "@hackerfeed/ui/atoms/PageContainer";
import { Panel } from "@hackerfeed/ui/atoms/Panel";
import { Skeleton, SkeletonGroup } from "@hackerfeed/ui/atoms/Skeleton";
import { Stack } from "@hackerfeed/ui/atoms/Stack";
import { EmptyState } from "@hackerfeed/ui/molecules/EmptyState";
import { PageHeader } from "@hackerfeed/ui/molecules/PageHeader";
import { ReadingCalendar } from "#/components/organisms/analytics/ReadingCalendar";
import { ReadingStreak } from "#/components/organisms/analytics/ReadingStreak";
import { ReadingTrend } from "#/components/organisms/analytics/ReadingTrend";
import { useReadingDays } from "#/hooks/useReadingDays";
import { formatLongDay, localDateKey } from "#/lib/analytics/reading-days";

export function AnalyticsPage() {
	const { data: days, isError, refetch } = useReadingDays();
	const today = localDateKey(new Date());
	const since = days?.[0]?.date;

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
				) : !days ? (
					<SkeletonGroup>
						<Stack gap="section">
							<Skeleton height="block" shape="block" />
							<Skeleton height="avatar" shape="block" />
						</Stack>
					</SkeletonGroup>
				) : days.length === 0 ? (
					<EmptyState
						title="No reading yet"
						headingSize="section"
						description="Open a story or a paper and your streak starts today."
						action={<ButtonLink to="/">Browse stories</ButtonLink>}
					/>
				) : (
					<>
						<ReadingStreak days={days} today={today} />
						<Panel>
							<ReadingTrend days={days} today={today} />
						</Panel>
						<Panel>
							<ReadingCalendar days={days} today={today} />
						</Panel>
					</>
				)}
			</Stack>
		</PageContainer>
	);
}
