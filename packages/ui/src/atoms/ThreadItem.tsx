import type { ReactNode } from "react";

const DEPTH_BORDERS = [
	"",
	"border-l-2 pl-4 border-(--lagoon)/60",
	"border-l-2 pl-4 border-(--lagoon)/40",
	"border-l-2 pl-4 border-(--lagoon)/25",
	"border-l-2 pl-4 border-(--lagoon)/15",
] as const;

/** One entry in a comment thread; replies get an indented line that fades with depth. */
export function ThreadItem({
	depth = 0,
	children,
}: {
	depth?: number;
	children: ReactNode;
}) {
	const border = DEPTH_BORDERS[Math.min(depth, DEPTH_BORDERS.length - 1)];
	return <div className={`${border} py-3`}>{children}</div>;
}
