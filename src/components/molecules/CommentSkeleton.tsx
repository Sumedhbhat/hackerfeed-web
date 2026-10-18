import { Skeleton, SkeletonGroup } from "#/components/atoms/Skeleton";
import { Stack } from "#/components/atoms/Stack";

/** Placeholder with the shape of one comment, shown while replies load. */
export function CommentSkeleton() {
	return (
		<div className="py-4">
			<SkeletonGroup>
				<Stack gap="sm">
					<Skeleton width="7rem" height="xs" opacity={0.6} />
					<Skeleton width="80%" height="sm" opacity={0.4} />
					<Skeleton width="60%" height="sm" opacity={0.3} />
				</Stack>
			</SkeletonGroup>
		</div>
	);
}
