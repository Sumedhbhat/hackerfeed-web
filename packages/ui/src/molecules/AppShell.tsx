import type { ReactNode } from "react";
import { NEW_TAB_NOTE_ID } from "../atoms/Link";

/** Full-height page frame: header on top, footer at the bottom, content filling the rest. */
export function AppShell({
	header,
	footer,
	children,
}: {
	header: ReactNode;
	footer: ReactNode;
	children: ReactNode;
}) {
	return (
		<div className="app-shell">
			<a
				href="#content"
				className="sr-only rounded-md bg-surface px-3 py-2 text-sm font-semibold text-accent-strong shadow-(--shadow-raised) focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60]"
			>
				Skip to content
			</a>
			<span id={NEW_TAB_NOTE_ID} hidden>
				Opens in a new tab
			</span>
			{header}
			<div id="content" tabIndex={-1} className="app-content outline-none">
				{children}
			</div>
			{footer}
		</div>
	);
}
