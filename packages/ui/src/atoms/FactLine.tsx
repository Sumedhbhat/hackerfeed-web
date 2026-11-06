import type { ReactNode } from "react";

/** A small faint line of facts under a title, separated by space rather than punctuation. */
export function FactLine({ children }: { children: ReactNode }) {
	return (
		<div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-meta text-(--sea-ink-faint)">
			{children}
		</div>
	);
}
