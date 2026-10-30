import type { ReactNode } from "react";

/** Small uppercase eyebrow label shown above a heading. */
export function Kicker({
	children,
	as: Element = "p",
}: {
	children: ReactNode;
	as?: "p" | "span";
}) {
	return <Element className="island-kicker m-0">{children}</Element>;
}
