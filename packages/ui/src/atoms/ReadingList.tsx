import type { ReactNode } from "react";

/**
 * The look of one item in a ReadingList: its own bordered card, tinted once
 * saved. Rows use it so each story or paper reads as a block of its own.
 */
export function readingCardClassName(saved = false): string {
	return `relative rounded-xl border border-(--line) shadow-(--shadow-raised) ${saved ? "bg-(--bookmark-tint)" : "bg-(--surface-strong)"}`;
}

/** A list of stories or papers, each in its own card with space between. */
export function ReadingList({
	children,
	ordered = false,
	id,
	"aria-label": ariaLabel,
}: {
	children: ReactNode;
	/** Use an ordered list when the position means something (feed rank). */
	ordered?: boolean;
	/** Lets a page move focus into the list (e.g. to the first row after "Load more"). */
	id?: string;
	"aria-label"?: string;
}) {
	const Element = ordered ? "ol" : "ul";
	return (
		<Element
			id={id}
			aria-label={ariaLabel}
			className="m-0 flex list-none flex-col gap-3 p-0"
		>
			{children}
		</Element>
	);
}
