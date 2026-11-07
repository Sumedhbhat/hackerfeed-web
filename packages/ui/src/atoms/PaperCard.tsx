import type { ReactNode } from "react";
import { readingCardClassName } from "./ReadingList";

/**
 * One paper in a PaperList, as its own card, tinted once saved. Its title is
 * a `card` link, so a click anywhere on the card opens the paper.
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
			<article className="flex flex-col gap-2 p-4 sm:p-6">{children}</article>
		</li>
	);
}
