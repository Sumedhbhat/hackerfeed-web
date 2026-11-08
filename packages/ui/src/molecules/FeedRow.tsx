import type { ReactNode } from "react";
import { readingCardClassName } from "../atoms/ReadingList";

/** Fixed minimum widths so the actions line up from row to row. */
const CELL = ["", "min-w-[3.25rem] sm:min-w-[7.5rem]"];

export function FeedRow({
	saved = false,
	title,
	meta,
	actions,
	save,
}: {
	saved?: boolean;
	title: ReactNode;
	meta: ReactNode;
	/** AI action, then discussion: each takes the matching CELL width. */
	actions: ReactNode[];
	save: ReactNode;
}) {
	return (
		<li
			className={`${readingCardClassName(saved)} p-4 transition-colors sm:p-5 ${saved ? "" : "hover:border-(--field-line)"}`}
		>
			<div className="flex min-w-0 flex-col gap-4 sm:gap-5">
				<div className="flex flex-col gap-2">
					<div>{title}</div>
					{meta}
				</div>
				{/* Above the title link's stretched hit area, so these stay clickable. */}
				<div className="action-row relative z-10 -ml-1.5 flex flex-wrap items-center gap-1 sm:-mr-2 sm:-ml-2">
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
