import type { ReactNode } from "react";

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
			{/* First stop on every page: jump past the header (WCAG 2.4.1). */}
			<a
				href="#content"
				className="sr-only rounded-md bg-(--surface-strong) px-3 py-2 text-sm font-semibold text-(--lagoon-deep) shadow-(--shadow-raised) focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60]"
			>
				Skip to content
			</a>
			{header}
			<div id="content" tabIndex={-1} className="app-content outline-none">
				{children}
			</div>
			{footer}
		</div>
	);
}
