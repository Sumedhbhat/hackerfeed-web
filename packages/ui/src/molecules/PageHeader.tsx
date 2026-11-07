import type { ReactNode } from "react";
import { Heading } from "../atoms/Heading";
import { Text } from "../atoms/Text";

/** Page title with optional controls (tabs, filters) beside it, dropping below only when they don't fit. */
export function PageHeader({
	title,
	hideTitle = false,
	description,
	children,
}: {
	title: string;
	/** Only for screen readers, when the nav already says where you are (Stories). */
	hideTitle?: boolean;
	description?: ReactNode;
	children?: ReactNode;
}) {
	if (hideTitle) {
		return (
			<div className="flex flex-col gap-1">
				<Heading level={1} size="page" visuallyHidden>
					{title}
				</Heading>
				{children}
			</div>
		);
	}
	return (
		<div className="flex flex-col gap-1">
			<div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
				<div className="flex min-w-0 flex-col gap-1">
					<Heading level={1} size="page">
						{title}
					</Heading>
					{description ? <Text tone="soft">{description}</Text> : null}
				</div>
				{children}
			</div>
		</div>
	);
}
