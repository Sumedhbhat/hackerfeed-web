import type { ReactNode } from "react";

/** Bottom of a PaperCard: actions with `save` always at the far end, then keywords. */
export function PaperCardFooter({
	actions,
	save,
	keywords,
}: {
	actions: ReactNode;
	save?: ReactNode;
	keywords?: ReactNode;
}) {
	return (
		<footer className="flex min-w-0 flex-col gap-1.5">
			<div className="-ml-1.5 flex items-start gap-0.5">
				<div className="flex min-w-0 flex-wrap items-center gap-0.5">
					{actions}
				</div>
				{save ? <div className="ml-auto shrink-0">{save}</div> : null}
			</div>
			{keywords}
		</footer>
	);
}
