import type { ReactNode } from "react";

/**
 * A small faint line of facts under a title, separated by space rather than
 * punctuation. It wraps instead of cutting a fact short, so nothing is lost
 * to larger text or wider spacing (WCAG 1.4.12).
 */
export function FactLine({ children }: { children: ReactNode }) {
	return (
		<div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-(--sea-ink-faint) sm:text-meta">
			{children}
		</div>
	);
}
