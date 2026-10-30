import type { ReactNode } from "react";

const SIZE = {
	/** Large page title. */
	page: "text-2xl font-semibold tracking-tight",
	/** Article/story title at the top of a detail page. */
	title: "text-xl font-semibold leading-snug sm:text-2xl",
	/** Section heading inside a page or card. */
	section: "text-xl font-semibold tracking-tight",
	/** Card or list item title. */
	card: "text-lg font-semibold leading-snug sm:text-xl",
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
	/** Makes the heading clickable (e.g. a story title that opens the story). */
	onClick?: () => void;
	onKeyDown?: (event: React.KeyboardEvent<HTMLHeadingElement>) => void;
};

export function Heading({
	level = 2,
	size = "section",
	truncate = false,
	...props
}: HeadingProps) {
	const Element = `h${level}` as const;
	const cursor = props.onClick ? " cursor-pointer" : "";
	const truncation = truncate ? " truncate" : "";
	return (
		<Element
			className={`m-0 text-(--sea-ink) ${SIZE[size]}${cursor}${truncation}`}
			{...props}
		/>
	);
}
