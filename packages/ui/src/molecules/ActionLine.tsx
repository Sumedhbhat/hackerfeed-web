import type { ReactNode } from "react";

/**
 * A wrapping line of text-style actions under some text. It pulls left by the
 * buttons' own padding, so the first label lines up with the text above.
 */
export function ActionLine({ children }: { children: ReactNode }) {
	return (
		<div className="relative z-10 -ml-1.5 flex flex-wrap items-center gap-x-0.5 sm:-ml-2">
			{children}
		</div>
	);
}
