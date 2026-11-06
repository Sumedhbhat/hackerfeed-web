import type { ReactNode } from "react";

/**
 * Words inside a link or button that phones leave out to save room
 * ("4 comments" becomes "4"). Give the control an aria-label that still says
 * the full thing; this text is hidden from screen readers to avoid repeating it.
 */
export function WideText({ children }: { children: ReactNode }) {
	return (
		<span aria-hidden="true" className="max-sm:hidden">
			{children}
		</span>
	);
}
