import type { ReactNode } from "react";

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
			{saved ? (
				<span
					aria-hidden="true"
					className="ribbon-drop absolute top-0 right-4 h-6 w-3.5 bg-(--bookmark-ribbon) [clip-path:polygon(0_0,100%_0,100%_100%,50%_72%,0_100%)] sm:right-6"
				/>
			) : null}
			<article className="flex flex-col gap-3 px-4 py-5 sm:px-6">
				{children}
			</article>
		</li>
	);
}
