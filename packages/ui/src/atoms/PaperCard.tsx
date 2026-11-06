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
					className="ribbon absolute top-0 right-5 h-5 w-3 sm:right-8"
				/>
			) : null}
			<article className="flex flex-col gap-3 px-4 py-5 sm:px-6">
				{children}
			</article>
		</li>
	);
}
