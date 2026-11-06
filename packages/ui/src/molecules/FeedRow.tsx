import type { ReactNode } from "react";
import { Ribbon } from "../atoms/Ribbon";

/**
 * One story in a ReadingList: optional rank in the margin, the title, then the
 * facts and the actions. From `lg` up facts and actions share one line, with
 * the actions in fixed columns so they line up from row to row; below that the
 * actions get their own line. `save` always sits at the far right, directly
 * under the brass ribbon that hangs from the row once the story is saved.
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
			{saved ? <Ribbon /> : null}
			{rank != null ? (
				<span
					aria-hidden="true"
					className="hidden w-7 shrink-0 text-right font-serif text-row text-(--sea-ink-faint) tabular-nums sm:block"
				>
					{rank}
				</span>
			) : null}
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<div className="pr-8">{title}</div>
				<div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
					{meta}
					<div className="-ml-1.5 flex items-center sm:-mr-2 lg:ml-0 lg:shrink-0">
						<div className="grid grid-cols-[7rem_6.75rem_auto] items-center justify-items-start sm:grid-cols-[7.25rem_7.5rem_auto] lg:grid-cols-[7.25rem_7.5rem_5.25rem]">
							{actions}
						</div>
						<div className="ml-auto lg:ml-0">{save}</div>
					</div>
				</div>
			</div>
		</li>
	);
}
