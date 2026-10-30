import { Card } from "../atoms/Card";
import { Skeleton, SkeletonGroup } from "../atoms/Skeleton";

/** Card holding one pulsing bar, shown while a section loads. */
export function CardSkeleton({
	width,
	height = "md",
}: {
	/** Any CSS width for the bar, e.g. "50%". */
	width: string;
	height?: "md" | "xl";
}) {
	return (
		<Card as="div" padding="lg">
			<SkeletonGroup>
				<Skeleton width={width} height={height} shape="block" />
			</SkeletonGroup>
		</Card>
	);
}
