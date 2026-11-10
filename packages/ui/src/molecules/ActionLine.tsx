import type { ReactNode } from "react";

/**
 * The negative margin cancels the buttons' padding so the first label lines
 * up with the text above. `flush` also trims the targets' extra height (see
 * `.action-row`).
 */
export function ActionLine({
	children,
	flush = false,
}: {
	children: ReactNode;
	flush?: boolean;
}) {
	return (
		<div
			className={`relative z-10 -ml-1.5 flex flex-wrap items-center gap-x-0.5 sm:-ml-2 ${flush ? "action-row" : ""}`}
		>
			{children}
		</div>
	);
}
