import type { ReactNode } from "react";
import { Heading } from "../atoms/Heading";

/** Page title with optional controls (tabs, filters) beside it, dropping below only when they don't fit. */
export function PageHeader({
	title,
	dateline,
	description,
	children,
}: {
	title: string;
	/** The day this page is for, shown above the title like an edition date. */
	dateline?: ReactNode;
	description?: ReactNode;
	children?: ReactNode;
}) {
	return (
		<div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
			<div className="flex min-w-0 flex-col gap-1">
				{dateline !== undefined ? (
					<p className="m-0 min-h-6 font-serif text-base text-(--sea-ink-soft) italic">
						{dateline}
					</p>
				) : null}
				<Heading level={1} size="page">
					{title}
				</Heading>
				{description ? (
					<p className="m-0 text-sm text-(--sea-ink-soft)">{description}</p>
				) : null}
			</div>
			{children}
		</div>
	);
}
