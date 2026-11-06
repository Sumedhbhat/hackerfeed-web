import type { ReactNode } from "react";

/** Bottom of a PaperCard: facts, then actions with `save` always at the far end, then keywords. */
export function PaperCardFooter({
	signals,
	actions,
	save,
	keywords,
}: {
	signals: ReactNode;
	actions: ReactNode;
	save?: ReactNode;
	keywords?: ReactNode;
}) {
	return (
		<footer className="flex min-w-0 flex-col gap-2.5">
			{signals}
			<div className="-ml-1.5 flex items-center gap-0.5">
				<div className="flex min-w-0 flex-wrap items-center gap-0.5">
					{actions}
				</div>
				{save ? <div className="ml-auto shrink-0">{save}</div> : null}
			</div>
			{keywords}
		</footer>
	);
}
