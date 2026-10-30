import { Card } from "#/components/atoms/Card";
import { PageContainer } from "#/components/atoms/PageContainer";
import { Row } from "#/components/atoms/Row";
import { Skeleton, SkeletonGroup } from "#/components/atoms/Skeleton";

/** Placeholder for the story detail page: back link and story header card. */
export function StoryPageSkeleton() {
	return (
		<PageContainer>
			<SkeletonGroup>
				<div className="mb-6">
					<Skeleton width="3rem" height="md" shape="block" opacity={0.6} />
				</div>
				<Card padding="md">
					<div className="flex flex-col">
						<div className="mb-3">
							<Skeleton width="6rem" height="xs" opacity={0.4} />
						</div>
						<div className="mb-4">
							<Skeleton width="75%" height="xl" shape="block" opacity={0.5} />
						</div>
						<div className="mb-5">
							<Skeleton width="8rem" height="sm" opacity={0.3} />
						</div>
						<Row gap="lg">
							<Skeleton width="6rem" height="md" shape="block" opacity={0.4} />
							<Skeleton width="5rem" height="md" shape="block" opacity={0.3} />
						</Row>
					</div>
				</Card>
			</SkeletonGroup>
		</PageContainer>
	);
}
