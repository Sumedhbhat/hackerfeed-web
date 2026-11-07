import type { ReactNode } from "react";

/** Minimum widths of the action cells, so the actions line up from row to row. */
const CELL = ["", "min-w-[3.25rem] sm:min-w-[7.5rem]"];

/**
 * One story in a ReadingList: optional rank in the margin, the title, then the
 * facts and the actions. The whole row opens the story: `title` holds a
 * `card` link whose hit area stretches over the row, and the actions sit
 * above it. From `lg` up facts and
 * actions share one line when they fit; the actions wrap instead of
 * overflowing when larger text doesn't fit (WCAG 1.4.4). `save` always sits at
 * the far right; a saved row is tinted.
 */
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
	/** The heading, with a `card` link so a click anywhere on the row opens it. */
	title: ReactNode;
	meta: ReactNode;
	/** AI and discussion actions, in that order (one cell each). */
	actions: ReactNode[];
	save: ReactNode;
}) {
	return (
		<li
			className={`relative flex gap-4 px-4 pt-3 pb-1 sm:px-6 sm:pt-3.5 sm:pb-2.5 ${saved ? "bg-(--bookmark-tint)" : "hover:bg-(--chip-bg)/60"}`}
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
					{/* Above the title link's stretched hit area, so these stay clickable. */}
					<div className="relative z-10 -mt-1.5 -ml-1.5 flex flex-wrap items-center gap-1 sm:-mr-2 sm:-ml-2 lg:mt-0 lg:ml-0">
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
