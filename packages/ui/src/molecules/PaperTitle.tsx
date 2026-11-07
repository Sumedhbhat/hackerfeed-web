import type { ReactNode } from "react";
import { Heading } from "../atoms/Heading";
import { ExternalLink } from "../atoms/Link";

/**
 * Paper title linking out to the paper. It stays clickable but out of the tab
 * order: the "Read paper" action goes to the same place and carries the name.
 */
export function PaperTitle({
	children,
	href,
	onClick,
}: {
	children: ReactNode;
	href: string;
	onClick?: () => void;
}) {
	return (
		<Heading level={2} size="card">
			<ExternalLink href={href} variant="plain" onClick={onClick} tabIndex={-1}>
				{children}
			</ExternalLink>
		</Heading>
	);
}
