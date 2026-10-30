import type { ReactNode } from "react";

/** One-line warning with an optional action, e.g. "Could not load saved favorites. [Refresh]". */
export function InlineNotice({
	message,
	action,
	role,
	boxed = false,
}: {
	message: ReactNode;
	action?: ReactNode;
	/** "alert" announces it immediately; otherwise it is a polite <output>. */
	role?: "alert";
	/** Draw it as a bordered box, e.g. an error under a chat transcript. */
	boxed?: boolean;
}) {
	const Element = role === "alert" ? "div" : "output";
	return (
		<Element
			className={
				boxed
					? "flex flex-wrap items-center gap-3 rounded-md border border-(--chip-line) p-3 text-sm text-(--sea-ink)"
					: "papers-favorites-error"
			}
			role={role}
		>
			<span>{message}</span>
			{action}
		</Element>
	);
}
