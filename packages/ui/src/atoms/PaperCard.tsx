import type { ReactNode } from "react";

/** One paper in a PaperList, tinted once it is saved. */
export function PaperCard({
	children,
	saved = false,
}: {
	children: ReactNode;
	saved?: boolean;
}) {
	return (
		<li className={`relative ${saved ? "bg-(--bookmark-tint)" : ""}`}>
			<article className="flex flex-col gap-2 px-4 pt-4 pb-2 sm:px-6 sm:pb-3">
				{children}
			</article>
		</li>
	);
}
