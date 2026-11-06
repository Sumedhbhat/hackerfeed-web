/** Wrapping row of keyword tags. */
export function KeywordList({
	keywords,
	"aria-label": ariaLabel,
}: {
	keywords: string[];
	"aria-label": string;
}) {
	return (
		<ul
			className="m-0 flex list-none flex-wrap gap-1.5 p-0"
			aria-label={ariaLabel}
		>
			{keywords.map((keyword) => (
				<li
					key={keyword}
					className="rounded-full bg-(--chip-bg) px-2.5 py-1 text-xs leading-none text-(--sea-ink-soft)"
				>
					{keyword}
				</li>
			))}
		</ul>
	);
}
