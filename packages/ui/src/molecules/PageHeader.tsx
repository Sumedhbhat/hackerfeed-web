import type { ReactNode } from "react";
import { Heading } from "../atoms/Heading";

/** Page title with optional controls (tabs, filters) beside it on wide screens and below it on phones. */
export function PageHeader({
	title,
	description,
	children,
}: {
	title: string;
	description?: ReactNode;
	children?: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
			<div className="flex min-w-0 flex-col gap-1">
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
