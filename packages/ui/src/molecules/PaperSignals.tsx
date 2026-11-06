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
		<div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[0.8125rem] leading-5 text-(--sea-ink-faint)">
			<span className="tabular-nums">
				{upvotes} {upvotes === 1 ? "upvote" : "upvotes"}
			</span>
			<span>{publishedLabel}</span>
			{hasCode ? <span>Code available</span> : null}
		</div>
	);
}
