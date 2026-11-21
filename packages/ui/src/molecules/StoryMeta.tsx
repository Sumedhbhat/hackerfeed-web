import { Eye } from "lucide-react";
import type { ReactNode } from "react";
import { FactLine } from "../atoms/FactLine";
import { Icon } from "../atoms/Icon";

export function StoryMeta({
	domain,
	by,
	age,
	score,
	viewed,
	trailing,
}: {
	domain?: string | null;
	by?: string | null;
	age?: string | null;
	score?: number | null;
	/** When the reader last opened the story, e.g. "2 days ago". */
	viewed?: string | null;
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
			{viewed ? (
				<span className="inline-flex items-center gap-1">
					<Icon icon={Eye} size={14} />
					Viewed {viewed.toLowerCase()}
				</span>
			) : null}
			{trailing}
		</FactLine>
	);
}
