import type { ReactNode } from "react";

const SIZE = {
	/** Large page title. */
	page: "font-serif text-page-sm font-semibold tracking-[-0.01em] sm:text-page",
	/** Article/story title at the top of a detail page. */
	title:
		"font-serif text-headline-sm font-semibold tracking-[-0.01em] sm:text-headline",
	/** Section heading inside a page or card. */
	section: "text-lg font-semibold tracking-tight",
	card: "font-serif text-row font-semibold leading-snug sm:text-xl",
	row: "text-lg font-semibold leading-snug sm:text-xl",
	inline: "text-read font-semibold",
	/** Small heading for panels and groups. */
	small: "text-base font-semibold tracking-tight",
} as const;

type HeadingProps = {
	children: ReactNode;
	level?: 1 | 2 | 3 | 4;
	size?: keyof typeof SIZE;
	id?: string;
	breakAnywhere?: boolean;
	visuallyHidden?: boolean;
};

export function Heading({
	level = 2,
	size = "section",
	breakAnywhere = false,
	visuallyHidden = false,
	...props
}: HeadingProps) {
	const Element = `h${level}` as const;
	const className = visuallyHidden
		? "sr-only"
		: `m-0 text-(--sea-ink) ${size === "row" ? "" : "text-pretty "}${SIZE[size]}${breakAnywhere ? " min-w-0 [overflow-wrap:anywhere]" : ""}`;
	return <Element className={className} {...props} />;
}
