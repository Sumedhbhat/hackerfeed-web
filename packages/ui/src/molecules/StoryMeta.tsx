import type { ReactNode } from "react";
import { FactLine } from "../atoms/FactLine";

/**
 * The facts under a story title: where it is from, how many points it has,
 * who posted it and when. `trailing` adds a last item such as a link.
 */
export function StoryMeta({
	domain,
	by,
	age,
	score,
	trailing,
	compact = false,
}: {
	domain?: string | null;
	by?: string | null;
	age?: string | null;
	score?: number | null;
	trailing?: ReactNode;
	/** List rows: leave the poster out on phones to keep the line short. */
	compact?: boolean;
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
			{by ? (
				<span data-shrink className={compact ? "hidden sm:inline" : undefined}>
					by {by}
				</span>
			) : null}
			{age ? <span>{age}</span> : null}
			{trailing}
		</FactLine>
	);
}
