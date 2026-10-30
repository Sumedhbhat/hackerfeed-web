/** Horizontally scrolling row of keyword tags. */
export function KeywordList({
	keywords,
	"aria-label": ariaLabel,
}: {
	keywords: string[];
	"aria-label": string;
}) {
	return (
		<ul className="papers-keyword-strip" aria-label={ariaLabel}>
			{keywords.map((keyword) => (
				<li key={keyword}>{keyword}</li>
			))}
		</ul>
	);
}
