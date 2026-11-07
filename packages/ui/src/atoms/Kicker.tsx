import type { ReactNode } from "react";

/** Short label shown above a heading. */
export function Kicker({
	children,
	as: Element = "p",
}: {
	children: ReactNode;
	as?: "p" | "span";
}) {
	return (
		<Element className="m-0 text-sm font-medium text-(--lagoon-deep)">
			{children}
		</Element>
	);
}
