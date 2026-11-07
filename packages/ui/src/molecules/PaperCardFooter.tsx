import type { ReactNode } from "react";

/**
 * Bottom of a PaperCard: the paper's links, with `save` always at the far
 * right of the first line (under the ribbon), as on story rows.
 */
export function PaperCardFooter({
	actions,
	save,
}: {
	actions: ReactNode;
	save?: ReactNode;
}) {
	return (
		<footer className="-ml-1.5 flex items-start gap-1 sm:-mr-2 sm:-ml-2">
			<div className="flex min-w-0 flex-wrap items-center gap-x-0.5">
				{actions}
			</div>
			{save ? <div className="ml-auto shrink-0">{save}</div> : null}
		</footer>
	);
}
