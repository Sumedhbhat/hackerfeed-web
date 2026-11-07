import type { ReactNode } from "react";

/**
 * Bottom of a PaperCard: the paper's main actions, with `save` at the far
 * right of that line. (The saved ribbon hangs from the card's top edge in the
 * same column.)
 */
export function PaperCardFooter({
	actions,
	save,
}: {
	actions: ReactNode;
	save?: ReactNode;
}) {
	return (
		<footer className="-mt-1 -ml-1.5 flex items-start gap-1 sm:-mr-2 sm:-ml-2">
			<div className="flex min-w-0 flex-wrap items-center gap-x-0.5">
				{actions}
			</div>
			{save ? <div className="ml-auto shrink-0">{save}</div> : null}
		</footer>
	);
}
