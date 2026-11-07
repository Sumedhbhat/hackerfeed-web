import type { ReactNode } from "react";

/**
 * A small faint line of facts under a title, separated by space rather than
 * punctuation. `singleLine` keeps it on one line from `sm` up: facts marked
 * `data-shrink` (the least important, such as the poster) are cut with an
 * ellipsis instead of wrapping.
 */
export function FactLine({
	children,
	singleLine = false,
}: {
	children: ReactNode;
	singleLine?: boolean;
}) {
	return (
		<div
			className={`flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-(--sea-ink-faint) sm:text-meta ${singleLine ? "sm:flex-nowrap sm:whitespace-nowrap sm:[&>*]:shrink-0 sm:[&>[data-shrink]]:min-w-0 sm:[&>[data-shrink]]:shrink sm:[&>[data-shrink]]:truncate" : ""}`}
		>
			{children}
		</div>
	);
}
