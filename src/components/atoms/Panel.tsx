import type { HTMLAttributes } from "react";

const WIDTH = {
	md: "max-w-xl",
	lg: "max-w-2xl",
	full: "",
} as const;

type PanelProps = Omit<HTMLAttributes<HTMLElement>, "className" | "style"> & {
	as?: "section" | "div" | "article";
	width?: keyof typeof WIDTH;
};

/** Flat bordered box, centered when given a width. Used for forms and status screens. */
export function Panel({
	as: Element = "section",
	width = "full",
	...props
}: PanelProps) {
	return (
		<Element
			className={`mx-auto w-full rounded-lg border border-(--line) bg-(--surface-strong) p-5 ${WIDTH[width]}`}
			{...props}
		/>
	);
}
