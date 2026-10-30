import { Card } from "../atoms/Card";
import { Row } from "../atoms/Row";
import { Skeleton, SkeletonGroup } from "../atoms/Skeleton";
import { Stack } from "../atoms/Stack";

/** Placeholder with the shape of a StoryCard, shown while stories load. */
export function StoryCardSkeleton() {
	return (
		<Card>
			<SkeletonGroup>
				<Row gap="xl" align="start">
					<div className="w-7 flex-none pt-1">
						<Skeleton width="1.25rem" height="sm" opacity={1} />
					</div>
					<Stack gap="md" grow>
						<Skeleton width="6rem" height="xs" opacity={1} />
						<Skeleton width="85%" height="lg" opacity={0.8} />
						<Skeleton width="60%" height="lg" opacity={0.6} />
						<Skeleton width="12rem" height="xs" opacity={0.5} />
						<Row gap="md">
							<Skeleton width="5rem" height="sm" opacity={0.6} />
							<Skeleton width="6rem" height="sm" opacity={0.4} />
							<Skeleton width="3.5rem" height="sm" opacity={0.3} />
						</Row>
					</Stack>
				</Row>
			</SkeletonGroup>
		</Card>
	);
}
