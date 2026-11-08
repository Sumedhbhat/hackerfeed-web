import type { MouseEvent, ReactNode } from "react";
import { TextLink } from "../atoms/Link";

/** "← Back" link at the top of detail pages. */
export function BackLink({
	to = "/",
	label = "← Back",
	onClick,
}: {
	to?: string;
	/** Text, optionally with an icon. */
	label?: ReactNode;
	onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
	return (
		<div className="mb-6">
			<TextLink to={to} variant="subtle" onClick={onClick}>
				{label}
			</TextLink>
		</div>
	);
}
