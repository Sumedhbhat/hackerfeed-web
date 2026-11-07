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
	/** E.g. to go back in history instead of forward when that is where the reader came from. */
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
