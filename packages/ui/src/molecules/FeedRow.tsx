import type { ReactNode } from "react";

/**
 * One story in a ReadingList: optional rank in the margin, the title, then a
 * line with the facts on the left and the actions on the right (stacked on
 * phones). Save is expected last, so it lands under the brass ribbon that
 * hangs from the row's corner once the story is saved.
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
		<li className="relative flex gap-4 px-4 pt-4 pb-3 sm:px-6 sm:pb-3.5">
			{saved ? (
				<span
					aria-hidden="true"
					className="ribbon-drop absolute top-0 right-5 h-5 w-3 bg-(--bookmark-ribbon) [clip-path:polygon(0_0,100%_0,100%_100%,50%_72%,0_100%)] sm:right-8"
				/>
			) : null}
			{rank != null ? (
				<span
					aria-hidden="true"
					className="hidden w-7 shrink-0 text-right font-serif text-row text-(--sea-ink-faint) tabular-nums sm:block"
				>
					{rank}
				</span>
			) : null}
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<div className="pr-6">{title}</div>
				<div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
					{meta}
					<div className="flex items-center gap-0.5 sm:-mr-2 sm:shrink-0 [&>:last-child]:ml-auto sm:[&>:last-child]:ml-0">
						{actions}
					</div>
				</div>
			</div>
		</li>
	);
}
