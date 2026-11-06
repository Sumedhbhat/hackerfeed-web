import type { ReactNode } from "react";

/** Bottom of a PaperCard: the main actions, then secondary links beside the keywords. */
export function PaperCardFooter({
	actions,
	resources,
	keywords,
}: {
	actions: ReactNode;
	resources?: ReactNode;
	keywords?: ReactNode;
}) {
	return (
		<footer className="flex min-w-0 flex-col gap-1">
			<div className="-ml-1.5 flex flex-wrap items-center gap-0.5">
				{actions}
			</div>
			{resources || keywords ? (
				<div className="-ml-1.5 flex flex-wrap items-center gap-x-1 gap-y-1">
					{resources}
					{keywords ? <div className="pl-1.5">{keywords}</div> : null}
				</div>
			) : null}
		</footer>
	);
}
