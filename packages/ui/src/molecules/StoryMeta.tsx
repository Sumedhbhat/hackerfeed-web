import type { ReactNode } from "react";
import { FactLine } from "../atoms/FactLine";

/**
 * The facts under a story title: where it is from, how many points it has,
 * who posted it and when. The poster is left out on phones to keep the line
 * short; `trailing` adds a last item such as a link.
 */
export function StoryMeta({
	domain,
	by,
	age,
	score,
	trailing,
}: {
	domain?: string | null;
	by?: string | null;
	age?: string | null;
	score?: number | null;
	trailing?: ReactNode;
}) {
	return (
		<FactLine singleLine>
			{domain ? (
				<span className="font-medium text-(--sea-ink-soft)">{domain}</span>
			) : null}
			{score != null ? (
				<span className="tabular-nums">
					{score} {score === 1 ? "point" : "points"}
				</span>
			) : null}
			{by ? <span className="hidden sm:inline">by {by}</span> : null}
			{age ? <span>{age}</span> : null}
			{trailing}
		</FactLine>
	);
}
