import { FactLine } from "../atoms/FactLine";

/** Upvotes, publish date and "has code" facts under a paper. */
export function PaperSignals({
	upvotes,
	publishedLabel,
	hasCode,
}: {
	upvotes: number;
	/** Already formatted, e.g. "21 Jun". */
	publishedLabel: string;
	hasCode: boolean;
}) {
	return (
		<FactLine>
			<span className="tabular-nums">
				{upvotes} {upvotes === 1 ? "upvote" : "upvotes"}
			</span>
			<span>{publishedLabel}</span>
			{hasCode ? <span>Code available</span> : null}
		</FactLine>
	);
}
