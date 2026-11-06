import type { ReactNode } from "react";
import { Ribbon } from "./Ribbon";

/** One paper in a PaperList. A brass ribbon hangs from the corner once it is saved. */
export function PaperCard({
	children,
	saved = false,
}: {
	children: ReactNode;
	saved?: boolean;
}) {
	return (
		<li className="relative">
			{saved ? <Ribbon /> : null}
			<article className="flex flex-col gap-2 px-4 pt-4 pb-3 sm:px-6">
				{children}
			</article>
		</li>
	);
}
