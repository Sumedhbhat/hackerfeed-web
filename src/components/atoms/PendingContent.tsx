import type { ReactNode } from "react";

/** Fades its content and blocks clicks while a transition is pending. */
export function PendingContent({
	pending,
	children,
}: {
	pending: boolean;
	children: ReactNode;
}) {
	return (
		<div
			className={`transition-opacity ${pending ? "pointer-events-none opacity-50" : ""}`}
		>
			{children}
		</div>
	);
}
