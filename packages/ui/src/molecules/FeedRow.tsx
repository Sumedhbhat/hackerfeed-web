import type { ReactNode } from "react";

/**
 * One story in a ReadingList: optional rank in the margin, then title, facts
 * and actions. A brass ribbon hangs from the corner once it is saved.
 */
export function FeedRow({
	rank,
	saved = false,
	title,
	meta,
	actions,
}: {
	rank?: number;
	saved?: boolean;
	title: ReactNode;
	meta: ReactNode;
	actions: ReactNode;
}) {
	return (
		<li className="relative flex gap-3 px-4 py-4 sm:gap-4 sm:px-6">
			{saved ? (
				<span
					aria-hidden="true"
					className="ribbon-drop absolute top-0 right-4 h-6 w-3.5 bg-(--bookmark-ribbon) [clip-path:polygon(0_0,100%_0,100%_100%,50%_72%,0_100%)] sm:right-6"
				/>
			) : null}
			{rank != null ? (
				<span
					aria-hidden="true"
					className="hidden w-7 shrink-0 pt-px text-right font-serif text-[1.1875rem] leading-snug text-(--sea-ink-faint) tabular-nums sm:block"
				>
					{rank}
				</span>
			) : null}
			<div className="flex min-w-0 flex-1 flex-col gap-1.5 pr-4 sm:pr-5">
				{title}
				{meta}
				<div className="-ml-2 flex flex-wrap items-center gap-x-0.5 gap-y-1 pt-1 sm:gap-x-1">
					{actions}
				</div>
			</div>
		</li>
	);
}
