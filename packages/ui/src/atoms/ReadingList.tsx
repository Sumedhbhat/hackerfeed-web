import type { ReactNode } from "react";

export function readingCardClassName(saved = false): string {
	return `relative rounded-xl border border-line shadow-(--shadow-raised) ${saved ? "bg-bookmark-tint" : "bg-surface"}`;
}

export function ReadingList({
	children,
	ordered = false,
	id,
	"aria-label": ariaLabel,
}: {
	children: ReactNode;
	ordered?: boolean;
	id?: string;
	"aria-label"?: string;
}) {
	const Element = ordered ? "ol" : "ul";
	return (
		<Element
			id={id}
			aria-label={ariaLabel}
			className="m-0 flex list-none flex-col gap-3 p-0"
		>
			{children}
		</Element>
	);
}
