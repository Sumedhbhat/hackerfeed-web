import type { HTMLAttributes } from "react";

const GAP = {
	none: "gap-0",
	xs: "gap-1",
	sm: "gap-2",
	md: "gap-3",
	lg: "gap-5",
	xl: "gap-8",
} as const;

const ALIGN = {
	stretch: "items-stretch",
	start: "items-start",
	center: "items-center",
} as const;

type StackProps = Omit<HTMLAttributes<HTMLElement>, "className" | "style"> & {
	as?: "div" | "section" | "ul" | "ol" | "header" | "footer" | "nav";
	gap?: keyof typeof GAP;
	align?: keyof typeof ALIGN;
	/** Draw a hairline between children. */
	divided?: boolean;
	/** Take the remaining width in a Row and allow children to shrink. */
	grow?: boolean;
};

/** Lays children out top to bottom with even spacing. */
export function Stack({
	as: Element = "div",
	gap = "md",
	align = "stretch",
	divided = false,
	grow = false,
	...props
}: StackProps) {
	const className = [
		"m-0 flex list-none flex-col p-0",
		GAP[gap],
		ALIGN[align],
		divided && "divide-y divide-(--line)",
		grow && "min-w-0 flex-1",
	]
		.filter(Boolean)
		.join(" ");
	return <Element className={className} {...props} />;
}
