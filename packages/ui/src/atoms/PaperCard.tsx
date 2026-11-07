import type { ReactNode } from "react";
import { Ribbon } from "./Ribbon";

/** One paper in a PaperList. A brass ribbon hangs from the corner once it is saved. */
export function PaperCard({
	children,
	saved = false,
	justSaved = false,
}: {
	children: ReactNode;
	saved?: boolean;
	/** The reader just pressed Save: let the ribbon drop in. */
	justSaved?: boolean;
}) {
	return (
		<li className="relative">
			{saved ? <Ribbon drop={justSaved} /> : null}
			<article className="flex flex-col gap-2 px-4 pt-4 pb-2 sm:px-6 sm:pb-3">
				{children}
			</article>
		</li>
	);
}
