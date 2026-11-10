import type { ReactNode } from "react";

export function PaperCardFooter({
	actions,
	save,
}: {
	actions: ReactNode;
	save?: ReactNode;
}) {
	return (
		<footer className="action-row relative z-10 -ml-1.5 flex flex-wrap items-center gap-1 sm:-mr-2 sm:-ml-2">
			<div className="flex flex-wrap items-center gap-x-0.5">{actions}</div>
			{save ? <div className="ml-auto shrink-0">{save}</div> : null}
		</footer>
	);
}
