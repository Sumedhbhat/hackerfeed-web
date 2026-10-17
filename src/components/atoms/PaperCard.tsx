import type { ReactNode } from "react";

/** Bordered surface for one paper in a list; fades in, optionally staggered. */
export function PaperCard({
	children,
	animationDelay,
}: {
	children: ReactNode;
	/** Entrance animation delay in ms. */
	animationDelay?: number;
}) {
	return (
		<article
			className="papers-card papers-row rise-in"
			style={
				animationDelay === undefined
					? undefined
					: { animationDelay: `${animationDelay}ms` }
			}
		>
			{children}
		</article>
	);
}
