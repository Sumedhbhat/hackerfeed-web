import { StoryCardSkeleton } from "#/components/story-card";
import { PAGE_SIZE } from "#/lib/hacker-news/queries";

const SKELETON_KEYS = Array.from(
	{ length: PAGE_SIZE },
	(_, i) => `skeleton-${i}`,
);

export function FeedSkeletons() {
	return (
		<div className="space-y-3">
			{SKELETON_KEYS.map((key, i) => (
				<StoryCardSkeleton key={key} index={i} />
			))}
		</div>
	);
}
