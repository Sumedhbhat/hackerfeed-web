import type { ReactNode } from "react";

const DEPTH_BORDERS = [
	"",
	"ml-1 border-l-2 border-(--chip-line) pl-4 sm:pl-5",
	"ml-1 border-l-2 border-(--chip-line) pl-4 sm:pl-5",
	"ml-1 border-l-2 border-(--chip-line) pl-3 sm:pl-5",
	"ml-1 border-l-2 border-(--chip-line) pl-3 sm:pl-4",
] as const;

/** One entry in a comment thread; replies hang off a thread line, indenting less as they nest. */
export function ThreadItem({
	depth = 0,
	children,
}: {
	depth?: number;
	children: ReactNode;
}) {
	const border = DEPTH_BORDERS[Math.min(depth, DEPTH_BORDERS.length - 1)];
	return <div className={`${border} py-3.5`}>{children}</div>;
}
