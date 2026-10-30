import type { ReactNode } from "react";

/** Paper title linking out to the paper. Must sit inside a PaperCard. */
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
		<h2>
			<a href={href} target="_blank" rel="noreferrer" onClick={onClick}>
				{children}
			</a>
		</h2>
	);
}
