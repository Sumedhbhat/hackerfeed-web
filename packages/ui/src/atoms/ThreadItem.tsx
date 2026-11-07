import type { ReactNode } from "react";

const DEPTH_BORDERS = [
	"",
	"ml-1 border-l-2 border-(--chip-line) pl-4 sm:pl-5",
	"ml-1 border-l-2 border-(--chip-line) pl-4 sm:pl-5",
	"ml-1 border-l-2 border-(--chip-line) pl-3 sm:pl-5",
	"ml-1 border-l-2 border-(--chip-line) pl-3 sm:pl-4",
] as const;

/**
 * A list of comments (a thread, or the replies to one comment). Nesting
 * lists is what tells assistive tech how deep a reply is.
 */
export function ThreadList({
	children,
	divided = false,
	"aria-label": ariaLabel,
}: {
	children: ReactNode;
	/** Hairlines between top-level comments. */
	divided?: boolean;
	"aria-label"?: string;
}) {
	return (
		<ul
			aria-label={ariaLabel}
			className={`m-0 list-none p-0${divided ? " divide-y divide-(--line)" : ""}`}
		>
			{children}
		</ul>
	);
}

/** One comment in a ThreadList; replies hang off a thread line, indenting less as they nest. */
export function ThreadItem({
	depth = 0,
	children,
}: {
	depth?: number;
	children: ReactNode;
}) {
	const border = DEPTH_BORDERS[Math.min(depth, DEPTH_BORDERS.length - 1)];
	return <li className={`${border} py-3.5`}>{children}</li>;
}
