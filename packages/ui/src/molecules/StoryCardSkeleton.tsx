import { readingCardClassName } from "../atoms/ReadingList";
import { Skeleton, SkeletonGroup } from "../atoms/Skeleton";

/** Placeholder with the shape of one feed row, shown while stories load. */
export function StoryCardSkeleton() {
	return (
		<li className={`${readingCardClassName()} p-4 sm:p-6`}>
			<div className="flex min-w-0 flex-col gap-2.5">
				<SkeletonGroup>
					<div className="flex flex-col gap-2.5">
						<Skeleton width="80%" height="lg" opacity={0.7} />
						<Skeleton width="16rem" height="xs" opacity={0.5} />
						<div className="flex gap-2 pt-1">
							<Skeleton
								width="6rem"
								height="control"
								shape="block"
								opacity={0.35}
							/>
							<Skeleton
								width="6rem"
								height="control"
								shape="block"
								opacity={0.25}
							/>
						</div>
					</div>
				</SkeletonGroup>
			</div>
		</li>
	);
}
