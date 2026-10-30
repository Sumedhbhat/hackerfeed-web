import type { ReactNode } from "react";

/** Full-height page background and centered column for the papers screen. */
export function PaperPageShell({ children }: { children: ReactNode }) {
	return (
		<main className="papers-page">
			<div className="papers-shell">{children}</div>
		</main>
	);
}
