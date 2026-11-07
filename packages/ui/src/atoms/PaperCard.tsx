import type { ReactNode } from "react";
import { readingCardClassName } from "./ReadingList";

/**
 * One paper in a PaperList, as its own card, tinted once saved. Its title is
 * a `card` link, so a click anywhere on the card opens the paper. Sections are
 * spaced like the card's padding (16px, 20px from sm), so every visible gap
 * matches.
 */
export function PaperCard({
	children,
	saved = false,
}: {
	children: ReactNode;
	saved?: boolean;
}) {
	return (
		<li className={readingCardClassName(saved)}>
			<article className="flex flex-col gap-4 p-4 sm:gap-5 sm:p-5">
				{children}
			</article>
		</li>
	);
}
