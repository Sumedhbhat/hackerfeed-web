import type { ReactNode } from "react";
import { Ribbon } from "./Ribbon";

/**
 * One paper in a PaperList: the title with `save` beside it at the far right,
 * directly under the brass ribbon that hangs from the card once it is saved,
 * then the rest of the paper.
 */
export function PaperCard({
	title,
	save,
	children,
	saved = false,
}: {
	title: ReactNode;
	save?: ReactNode;
	children: ReactNode;
	saved?: boolean;
}) {
	return (
		<li className="relative">
			{saved ? <Ribbon /> : null}
			<article className="flex flex-col gap-2 px-4 pt-4 pb-3 sm:px-6">
				<div className="flex items-start gap-2">
					<div className="min-w-0 flex-1 pt-1">{title}</div>
					{save ? (
						<div className="-mt-0.5 shrink-0 sm:-mr-2">{save}</div>
					) : null}
				</div>
				{children}
			</article>
		</li>
	);
}
