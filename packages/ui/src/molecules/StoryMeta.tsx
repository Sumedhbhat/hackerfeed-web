import type { ReactNode } from "react";
import { FactLine } from "../atoms/FactLine";

/**
 * The facts under a story title: where it is from, how many points it has,
 * when, and who posted it. `trailing` adds a last item such as a link.
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
		<FactLine>
			{domain ? <span className="text-(--sea-ink-soft)">{domain}</span> : null}
			{score != null ? (
				<span className="tabular-nums">
					{score} {score === 1 ? "point" : "points"}
				</span>
			) : null}
			{age ? <span>{age}</span> : null}
			{by ? <span>by {by}</span> : null}
			{trailing}
		</FactLine>
	);
}
