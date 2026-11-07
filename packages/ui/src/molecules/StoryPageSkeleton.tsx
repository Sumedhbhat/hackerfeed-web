import { PageContainer } from "../atoms/PageContainer";
import { Skeleton, SkeletonGroup } from "../atoms/Skeleton";

/** Placeholder for the story detail page: back link, title and actions. */
export function StoryPageSkeleton() {
	return (
		<PageContainer>
			<output aria-label="Loading story" className="block">
				<SkeletonGroup>
					<div className="flex flex-col gap-4">
						<Skeleton width="4rem" height="md" opacity={0.5} />
						<Skeleton width="14rem" height="xs" opacity={0.5} />
						<Skeleton width="85%" height="xl" shape="block" opacity={0.7} />
						<Skeleton width="55%" height="xl" shape="block" opacity={0.6} />
						<div className="flex gap-2">
							<Skeleton
								width="8rem"
								height="control"
								shape="block"
								opacity={0.4}
							/>
							<Skeleton
								width="6rem"
								height="control"
								shape="block"
								opacity={0.3}
							/>
						</div>
					</div>
				</SkeletonGroup>
			</output>
		</PageContainer>
	);
}
