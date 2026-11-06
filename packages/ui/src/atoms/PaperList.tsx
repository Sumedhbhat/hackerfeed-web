import type { ReactNode } from "react";
import { ReadingList } from "./ReadingList";

/** The sheet of PaperCards. */
export function PaperList({
	children,
	"aria-label": ariaLabel,
}: {
	children: ReactNode;
	"aria-label": string;
}) {
	return <ReadingList aria-label={ariaLabel}>{children}</ReadingList>;
}
