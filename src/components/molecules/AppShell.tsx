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
			{header}
			<div className="app-content">{children}</div>
			{footer}
		</div>
	);
}
