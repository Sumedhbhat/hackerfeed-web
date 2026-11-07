import { Card } from "../atoms/Card";
import { Skeleton, SkeletonGroup } from "../atoms/Skeleton";

/**
 * Card holding one pulsing bar, shown while a section loads. `label` (e.g.
 * "Loading chat") is what screen readers hear, since the bars are hidden from
 * them (WCAG 4.1.3).
 */
export function CardSkeleton({
	width,
	height = "md",
	label,
}: {
	/** Any CSS width for the bar, e.g. "50%". */
	width: string;
	height?: "md" | "xl";
	label: string;
}) {
	return (
		<output aria-label={label} className="block">
			<Card as="div" padding="lg">
				<SkeletonGroup>
					<Skeleton width={width} height={height} shape="block" />
				</SkeletonGroup>
			</Card>
		</output>
	);
}
