import type { HTMLAttributes } from "react";

const PADDING = {
	sm: "p-4 sm:p-5",
	lg: "p-6 sm:p-8",
} as const;

type CardProps = Omit<HTMLAttributes<HTMLElement>, "className" | "style"> & {
	as?: "article" | "section" | "div" | "li";
	padding?: keyof typeof PADDING;
};

/** Raised surface that groups one piece of content. */
export function Card({
	as: Element = "article",
	padding = "sm",
	...props
}: CardProps) {
	return (
		<Element
			className={`rounded-xl border border-(--line) bg-(--surface-strong) shadow-(--shadow-raised) ${PADDING[padding]}`}
			{...props}
		/>
	);
}
