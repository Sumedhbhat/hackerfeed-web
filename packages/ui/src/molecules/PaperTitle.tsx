import type { ReactNode } from "react";
import { Heading } from "../atoms/Heading";
import { ExternalLink } from "../atoms/Link";

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
			<ExternalLink href={href} variant="card" onClick={onClick}>
				{children}
			</ExternalLink>
		</Heading>
	);
}
