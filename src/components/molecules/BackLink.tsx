import type { ReactNode } from "react";
import { TextLink } from "#/components/atoms/Link";

/** "← Back" link at the top of detail pages. */
export function BackLink({
	to = "/",
	label = "← Back",
}: {
	to?: string;
	/** Text, optionally with an icon. */
	label?: ReactNode;
}) {
	return (
		<div className="mb-6">
			<TextLink to={to} variant="subtle">
				{label}
			</TextLink>
		</div>
	);
}
