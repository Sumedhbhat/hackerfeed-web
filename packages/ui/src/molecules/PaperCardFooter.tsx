import type { ReactNode } from "react";

/** Bottom of a PaperCard: facts, then actions, then keywords. */
export function PaperCardFooter({
	signals,
	actions,
	keywords,
}: {
	signals: ReactNode;
	actions: ReactNode;
	keywords?: ReactNode;
}) {
	return (
		<footer className="flex min-w-0 flex-col gap-2.5">
			{signals}
			<div className="-ml-0.5 flex flex-wrap items-center gap-1">{actions}</div>
			{keywords}
		</footer>
	);
}
