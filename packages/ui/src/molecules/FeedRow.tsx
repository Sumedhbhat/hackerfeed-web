import type { ReactNode } from "react";
import { readingCardClassName } from "../atoms/ReadingList";

/** Minimum widths of the action cells, so the actions line up from row to row. */
const CELL = ["", "min-w-[3.25rem] sm:min-w-[7.5rem]"];

/**
 * One story in a ReadingList, as its own card: the title, the facts, then the
 * actions, each on its own line. The whole card opens the story: `title`
 * holds a `card` link whose hit area stretches over it, and the actions sit
 * above that. The actions wrap instead of overflowing when larger text
 * doesn't fit (WCAG 1.4.4). `save` sits at the far right; a saved card is
 * tinted.
 */
export function FeedRow({
	saved = false,
	title,
	meta,
	actions,
	save,
}: {
	saved?: boolean;
	/** The heading, with a `card` link so a click anywhere on the row opens it. */
	title: ReactNode;
	meta: ReactNode;
	/** AI and discussion actions, in that order (one cell each). */
	actions: ReactNode[];
	save: ReactNode;
}) {
	return (
		<li
			className={`${readingCardClassName(saved)} p-4 transition-colors sm:p-6 ${saved ? "" : "hover:border-(--field-line)"}`}
		>
			<div className="flex min-w-0 flex-col gap-2">
				<div>{title}</div>
				{meta}
				{/* Above the title link's stretched hit area, so these stay clickable. */}
				<div className="relative z-10 -mb-1 -ml-1.5 flex flex-wrap items-center gap-1 pt-1 sm:-mr-2 sm:-ml-2">
					<div className="flex flex-wrap items-center">
						{actions.filter(Boolean).map((action, index) => (
							<div key={CELL[index]} className={CELL[index]}>
								{action}
							</div>
						))}
					</div>
					<div className="ml-auto">{save}</div>
				</div>
			</div>
		</li>
	);
}
