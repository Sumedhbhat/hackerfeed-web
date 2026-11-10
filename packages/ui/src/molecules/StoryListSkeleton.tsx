import { ReadingList } from "../atoms/ReadingList";
import { StoryCardSkeleton } from "./StoryCardSkeleton";

export function StoryListSkeleton({ count }: { count: number }) {
	return (
		<output aria-label="Loading stories" className="block">
			<ReadingList>
				{Array.from({ length: count }, (_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: placeholders are positional and never reorder
					<StoryCardSkeleton key={i} />
				))}
			</ReadingList>
		</output>
	);
}
