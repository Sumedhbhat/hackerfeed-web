import type { ReactNode } from "react";
import { FactLine } from "../atoms/FactLine";

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
			{domain ? (
				<span className="min-w-0 text-ink-soft [overflow-wrap:anywhere]">
					{domain}
				</span>
			) : null}
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
