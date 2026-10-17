import type { ReactNode } from "react";

/** The summary or abstract paragraph of a paper. */
export function PaperSummaryText({ children }: { children: ReactNode }) {
	return <p className="papers-summary is-compact">{children}</p>;
}
