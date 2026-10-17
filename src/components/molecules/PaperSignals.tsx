import { CalendarDays, Code2, ThumbsUp } from "lucide-react";

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
		<div className="papers-signals">
			<span>
				<ThumbsUp size={14} aria-hidden="true" /> {upvotes}
			</span>
			<span>
				<CalendarDays size={14} aria-hidden="true" /> {publishedLabel}
			</span>
			{hasCode ? (
				<span>
					<Code2 size={14} aria-hidden="true" /> Code
				</span>
			) : null}
		</div>
	);
}
