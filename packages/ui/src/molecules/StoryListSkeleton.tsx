import { Stack } from "../atoms/Stack";
import { StoryCardSkeleton } from "./StoryCardSkeleton";

/** A column of StoryCard placeholders, shown while a feed loads. */
export function StoryListSkeleton({ count }: { count: number }) {
	return (
		<Stack gap="md">
			{Array.from({ length: count }, (_, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: placeholders are positional and never reorder
				<StoryCardSkeleton key={i} />
			))}
		</Stack>
	);
}
