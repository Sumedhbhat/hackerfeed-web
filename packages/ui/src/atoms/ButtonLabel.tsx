import type { ReactNode } from "react";

/**
 * Text inside a button or link that phones show as icon-only. The words stay
 * in the accessible name, so screen readers and voice control still use them.
 * The hidden space keeps the name readable ("17 comments", not "17comments")
 * without widening the visible gap.
 */
export function ButtonLabel({ children }: { children: ReactNode }) {
	return (
		<>
			<span className="sr-only"> </span>
			<span className="sr-only sm:not-sr-only">{children}</span>
		</>
	);
}
