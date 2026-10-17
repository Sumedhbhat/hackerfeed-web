import type { HTMLAttributes } from "react";

const GAP = {
	none: "gap-0",
	xs: "gap-1",
	sm: "gap-2",
	md: "gap-3",
	lg: "gap-4",
	xl: "gap-6",
} as const;

const ALIGN = {
	start: "items-start",
	center: "items-center",
	end: "items-end",
	stretch: "items-stretch",
} as const;

const SM_ALIGN = {
	start: "sm:items-start",
	center: "sm:items-center",
	end: "sm:items-end",
	stretch: "sm:items-stretch",
} as const;

const JUSTIFY = {
	start: "justify-start",
	between: "justify-between",
	center: "justify-center",
	end: "justify-end",
} as const;

type RowProps = Omit<HTMLAttributes<HTMLElement>, "className" | "style"> & {
	as?: "div" | "section" | "ul" | "nav" | "header" | "footer" | "span";
	gap?: keyof typeof GAP;
	align?: keyof typeof ALIGN;
	justify?: keyof typeof JUSTIFY;
	/** Let items flow onto the next line when space runs out. */
	wrap?: boolean;
	/** Stack vertically on phones, side by side from `sm` up. */
	stackOnMobile?: boolean;
	/** Push this row to the far end of its parent row. */
	pushEnd?: boolean;
};

/** Lays children out side by side. */
export function Row({
	as: Element = "div",
	gap = "md",
	align = "center",
	justify = "start",
	wrap = false,
	stackOnMobile = false,
	pushEnd = false,
	...props
}: RowProps) {
	const className = [
		"m-0 flex list-none p-0",
		stackOnMobile ? "flex-col sm:flex-row" : "flex-row",
		GAP[gap],
		stackOnMobile ? SM_ALIGN[align] : ALIGN[align],
		JUSTIFY[justify],
		wrap && "flex-wrap",
		pushEnd && "ml-auto",
	]
		.filter(Boolean)
		.join(" ");
	return <Element className={className} {...props} />;
}
