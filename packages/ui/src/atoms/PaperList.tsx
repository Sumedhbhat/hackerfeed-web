import type { ReactNode } from "react";

export function PaperList({
	children,
	"aria-label": ariaLabel,
}: {
	children: ReactNode;
	"aria-label": string;
}) {
	return (
		<section className="papers-list" aria-label={ariaLabel}>
			{children}
		</section>
	);
}
