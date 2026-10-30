import { Text } from "../atoms/Text";

type StoryStatsProps = {
	score: number;
	by?: string | null;
	commentCount?: number | null;
};

/** Small faint "210 pts · author · 17 comments" line under a story title. */
export function StoryStats({ score, by, commentCount }: StoryStatsProps) {
	return (
		<Text size="xs" tone="faint">
			{score} pts
			{by ? <> &middot; {by}</> : null}
			{commentCount != null ? <> &middot; {commentCount} comments</> : null}
		</Text>
	);
}
