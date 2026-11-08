import type { ReactNode } from "react";
import { ReadingList } from "./ReadingList";

export function PaperList({
	children,
	id,
	"aria-label": ariaLabel,
}: {
	children: ReactNode;
	id?: string;
	"aria-label": string;
}) {
	return (
		<ReadingList id={id} aria-label={ariaLabel}>
			{children}
		</ReadingList>
	);
}
