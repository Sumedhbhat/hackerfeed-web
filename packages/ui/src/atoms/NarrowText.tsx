import type { ReactNode } from "react";

/**
 * The short form of a label, shown only on the narrowest phones (under 380px);
 * pair it with a WideText holding the full form. Hidden from screen readers:
 * give the control an aria-label with the full name.
 */
export function NarrowText({ children }: { children: ReactNode }) {
	return (
		<span aria-hidden="true" className="xs:hidden">
			{children}
		</span>
	);
}
