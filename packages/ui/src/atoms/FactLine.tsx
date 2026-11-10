import type { ReactNode } from "react";

export function FactLine({ children }: { children: ReactNode }) {
	return (
		<div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-(--sea-ink-faint) sm:text-meta">
			{children}
		</div>
	);
}
