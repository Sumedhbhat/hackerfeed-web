import { FactLine } from "../atoms/FactLine";

/** Upvotes and publish date under a paper. */
export function PaperSignals({
	upvotes,
	publishedLabel,
}: {
	upvotes: number;
	/** Already formatted, e.g. "21 Jun". */
	publishedLabel: string;
}) {
	return (
		<FactLine>
			<span className="tabular-nums">
				{upvotes} {upvotes === 1 ? "upvote" : "upvotes"}
			</span>
			<span>{publishedLabel}</span>
		</FactLine>
	);
}
