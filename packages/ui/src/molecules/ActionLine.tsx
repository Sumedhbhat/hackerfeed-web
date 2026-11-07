import type { ReactNode } from "react";

/**
 * A wrapping line of text-style actions under some text. It pulls left by the
 * buttons' own padding, so the first label lines up with the text above.
 * `flush` (inside a card) also trims the targets' extra height, so the gaps
 * above and below the row are the card's own spacing.
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
