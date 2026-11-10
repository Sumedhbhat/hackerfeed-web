import type { ReactNode } from "react";

export function Kicker({
	children,
	as: Element = "p",
}: {
	children: ReactNode;
	as?: "p" | "span";
}) {
	return (
		<Element className="m-0 text-sm font-medium text-accent-strong">
			{children}
		</Element>
	);
}
