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
		<footer className="papers-row-footer">
			{signals}
			<div className="papers-row-actions">{actions}</div>
			{keywords}
		</footer>
	);
}
