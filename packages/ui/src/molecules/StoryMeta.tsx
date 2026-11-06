/**
 * The facts under a story title: where it is from, how many points it has,
 * who posted it and when. Facts are separated by space, not punctuation.
 */
export function StoryMeta({
	domain,
	by,
	age,
	score,
}: {
	domain?: string | null;
	by?: string | null;
	age?: string | null;
	score?: number | null;
}) {
	return (
		<div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[0.8125rem] leading-5 text-(--sea-ink-faint)">
			{domain ? (
				<span className="font-medium text-(--sea-ink-soft)">{domain}</span>
			) : null}
			{score != null ? (
				<span className="tabular-nums">
					{score} {score === 1 ? "point" : "points"}
				</span>
			) : null}
			{by ? <span>by {by}</span> : null}
			{age ? <span>{age}</span> : null}
		</div>
	);
}
