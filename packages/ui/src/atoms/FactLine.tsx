import type { ReactNode } from "react";

/**
 * A small faint line of facts under a title, separated by space rather than
 * punctuation. `singleLine` keeps it on one line from `sm` up, shortening the
 * first fact (usually the domain) instead of wrapping.
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
			className={`flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-meta text-(--sea-ink-faint)${singleLine ? " sm:flex-nowrap sm:whitespace-nowrap sm:[&>*]:shrink-0 sm:[&>:first-child]:min-w-0 sm:[&>:first-child]:shrink sm:[&>:first-child]:truncate" : ""}`}
		>
			{children}
		</div>
	);
}
