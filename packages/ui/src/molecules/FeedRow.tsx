import type { ReactNode } from "react";

/**
 * One story in a ReadingList: optional rank in the margin, the title, then a
 * line with the facts on the left and the actions on the right (stacked on
 * phones). `save` always sits at the far end of that line, right under the
 * brass ribbon that hangs from the corner once the story is saved.
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
	title: ReactNode;
	meta: ReactNode;
	actions: ReactNode;
	save: ReactNode;
}) {
	return (
		<li className="relative flex gap-4 px-4 pt-4 pb-2 sm:px-6 sm:pb-3">
			{saved ? (
				<span
					aria-hidden="true"
					className="ribbon absolute top-0 right-6 h-5 w-3 sm:right-8"
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
				<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
					{meta}
					<div className="-ml-1.5 flex items-center gap-0.5 sm:-mr-2 sm:ml-0 sm:shrink-0">
						{actions}
						<div className="ml-auto sm:ml-0">{save}</div>
					</div>
				</div>
			</div>
		</li>
	);
}
