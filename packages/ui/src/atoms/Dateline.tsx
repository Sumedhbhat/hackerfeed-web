import type { ReactNode } from "react";

/** The day a page is for, set above its title like an edition date. Keeps its height while empty. */
export function Dateline({ children }: { children: ReactNode }) {
	return (
		<p className="m-0 min-h-6 font-serif text-base text-(--sea-ink-soft) italic">
			{children}
		</p>
	);
}
