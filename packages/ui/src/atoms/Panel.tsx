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

export function Panel({
	as: Element = "section",
	width = "full",
	...props
}: PanelProps) {
	return (
		<Element
			className={`w-full rounded-xl border border-line bg-surface p-5 shadow-(--shadow-raised) sm:p-6 ${WIDTH[width]}`}
			{...props}
		/>
	);
}
