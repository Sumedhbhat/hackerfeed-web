import { FactLine } from "../atoms/FactLine";

/** Authors, upvotes and publish date under a paper title, on one line where it fits. */
export function PaperSignals({
	authors,
	upvotes,
	publishedLabel,
}: {
	/** Already formatted, e.g. "Ada Lovelace, Alan Turing". */
	authors: string;
	upvotes: number;
	/** Already formatted, e.g. "21 Jun". */
	publishedLabel: string;
}) {
	return (
		<FactLine singleLine>
			{authors ? (
				<span data-shrink className="text-(--sea-ink-soft)">
					{authors}
				</span>
			) : null}
			<span className="tabular-nums">
				{upvotes} {upvotes === 1 ? "upvote" : "upvotes"}
			</span>
			<span>{publishedLabel}</span>
		</FactLine>
	);
}
