import type { ReactNode } from "react";

/**
 * One story in a ReadingList: optional rank in the margin, the title, then the
 * facts and the actions. From `lg` up facts and actions share one line when
 * they fit. Each action sits in a cell with a minimum width, so they line up
 * from row to row, and wrap instead of overflowing when larger text doesn't
 * fit (WCAG 1.4.4). `save` always sits at the far right; a saved row is
 * tinted.
 */
/** Minimum widths of the action cells, so the actions form columns. */
const CELL = [
	"min-w-[4.75rem] xs:min-w-[7rem] sm:min-w-[7.25rem]",
	"min-w-[3.25rem] sm:min-w-[7.5rem]",
	"lg:min-w-[5.25rem]",
];

export function FeedRow({
	rank,
	saved = false,
	title,
	meta,
	actions,
	save,
}: {
	rank?: number;
	saved?: boolean;
	title: ReactNode;
	meta: ReactNode;
	/** Read, discussion, and AI actions, in that order (one cell each). */
	actions: ReactNode[];
	save: ReactNode;
}) {
	return (
		<li
			className={`relative flex gap-4 px-4 pt-3 pb-1 sm:px-6 sm:pt-3.5 sm:pb-2.5 ${saved ? "bg-(--bookmark-tint)" : ""}`}
		>
			{rank != null ? (
				<span
					aria-hidden="true"
					className="hidden w-7 shrink-0 text-right font-serif text-row text-(--sea-ink-faint) [font-variant-numeric:oldstyle-nums_tabular-nums] sm:block"
				>
					{rank}
				</span>
			) : null}
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<div>{title}</div>
				<div className="flex flex-col gap-1 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:gap-x-8">
					{meta}
					<div className="-mt-1.5 -ml-1.5 flex flex-wrap items-center gap-1 sm:-mr-2 sm:-ml-2 lg:mt-0 lg:ml-0">
						<div className="flex flex-wrap items-center">
							{actions.filter(Boolean).map((action, index) => (
								<div key={CELL[index]} className={CELL[index]}>
									{action}
								</div>
							))}
						</div>
						<div className="ml-auto lg:ml-0">{save}</div>
					</div>
				</div>
			</div>
		</li>
	);
}
