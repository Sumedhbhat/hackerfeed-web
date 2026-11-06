import type { ReactNode } from "react";

/* Things you read (story and paper titles) are set in the serif; interface
   headings stay in the sans. */
const SIZE = {
	/** Large page title. */
	page: "font-serif text-page-sm font-semibold tracking-[-0.01em] sm:text-page",
	/** Article/story title at the top of a detail page. */
	title:
		"font-serif text-headline-sm font-semibold tracking-[-0.01em] sm:text-headline",
	/** Section heading inside a page or card. */
	section: "text-lg font-semibold tracking-tight",
	/** Card title, e.g. a paper. */
	card: "font-serif text-row font-semibold leading-snug sm:text-xl",
	/** Title of one row in a reading list. */
	row: "font-serif text-row-sm font-semibold sm:text-row",
	/** Small heading for panels and groups. */
	small: "text-base font-semibold tracking-tight",
} as const;

type HeadingProps = {
	children: ReactNode;
	level?: 1 | 2 | 3 | 4;
	size?: keyof typeof SIZE;
	id?: string;
	/** Cut off with an ellipsis instead of wrapping. */
	truncate?: boolean;
	/** Only for screen readers; names a region that is obvious visually. */
	visuallyHidden?: boolean;
};

export function Heading({
	level = 2,
	size = "section",
	truncate = false,
	visuallyHidden = false,
	...props
}: HeadingProps) {
	const Element = `h${level}` as const;
	const className = visuallyHidden
		? "sr-only"
		: `m-0 text-(--sea-ink) text-pretty ${SIZE[size]}${truncate ? " truncate" : ""}`;
	return <Element className={className} {...props} />;
}
