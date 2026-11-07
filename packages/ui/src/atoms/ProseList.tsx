import type { ReactNode } from "react";

/** A bulleted or numbered list in running text, e.g. inside a chat reply. */
export function ProseList({
	ordered = false,
	start,
	children,
}: {
	ordered?: boolean;
	/** First number of an ordered list, when it isn't 1. */
	start?: number;
	children: ReactNode;
}) {
	const List = ordered ? "ol" : "ul";
	return (
		<List
			start={ordered && start !== 1 ? start : undefined}
			className={`m-0 flex flex-col gap-1.5 pl-5 marker:text-(--sea-ink-faint) ${ordered ? "list-decimal" : "list-disc"}`}
		>
			{children}
		</List>
	);
}

/** One item of a ProseList; a nested ProseList goes after its text. */
export function ProseListItem({ children }: { children: ReactNode }) {
	return <li className="pl-1 [&>ol]:mt-1.5 [&>ul]:mt-1.5">{children}</li>;
}
