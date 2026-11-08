import type { ReactNode } from "react";
import { readingCardClassName } from "./ReadingList";

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
