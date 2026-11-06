import type { ReactNode } from "react";

/** One bordered sheet holding a list of stories or papers, rows split by hairlines. */
export function ReadingList({
	children,
	ordered = false,
	"aria-label": ariaLabel,
}: {
	children: ReactNode;
	/** Use an ordered list when the position means something (feed rank). */
	ordered?: boolean;
	"aria-label"?: string;
}) {
	const Element = ordered ? "ol" : "ul";
	return (
		<Element
			aria-label={ariaLabel}
			className="m-0 list-none divide-y divide-(--line) overflow-hidden rounded-xl border border-(--line) bg-(--surface-strong) p-0 shadow-(--shadow-raised)"
		>
			{children}
		</Element>
	);
}
