import { FactLine } from "../atoms/FactLine";

/** Real papers can carry a dozen keywords; the card shows the first few. */
const SHOWN_TOPICS = 3;

/** Authors, upvotes, publish date and topics under a paper title. */
export function PaperSignals({
	authors,
	upvotes,
	publishedLabel,
	topics = [],
}: {
	/** Already formatted, e.g. "Ada Lovelace, Alan Turing". */
	authors: string;
	upvotes: number;
	/** Already formatted, e.g. "21 Jun". */
	publishedLabel: string;
	topics?: string[];
}) {
	return (
		<FactLine>
			{authors ? (
				<span className="text-(--sea-ink-soft)">{authors}</span>
			) : null}
			<span className="tabular-nums">
				{upvotes} {upvotes === 1 ? "upvote" : "upvotes"}
			</span>
			<span>{publishedLabel}</span>
			{topics.length > 0 ? (
				<span>
					{topics.slice(0, SHOWN_TOPICS).join(", ")}
					{topics.length > SHOWN_TOPICS
						? ` +${topics.length - SHOWN_TOPICS} more`
						: ""}
				</span>
			) : null}
		</FactLine>
	);
}
