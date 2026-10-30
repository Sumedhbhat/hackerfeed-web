import type { HTMLAttributes } from "react";

const PADDING = {
	sm: "p-4 sm:p-6",
	md: "p-5 sm:p-7",
	lg: "p-6 sm:p-8",
} as const;

type CardProps = Omit<HTMLAttributes<HTMLElement>, "className" | "style"> & {
	as?: "article" | "section" | "div" | "li";
	padding?: keyof typeof PADDING;
	/** Fade and slide in on mount. */
	animated?: boolean;
	/** Delay the entrance animation, for staggered lists. */
	animationDelay?: number;
};

/** Raised surface that groups one piece of content. */
export function Card({
	as: Element = "article",
	padding = "sm",
	animated = false,
	animationDelay,
	...props
}: CardProps) {
	const className = [
		"island-shell rounded-lg",
		PADDING[padding],
		animated && "rise-in",
	]
		.filter(Boolean)
		.join(" ");
	return (
		<Element
			className={className}
			style={
				animationDelay ? { animationDelay: `${animationDelay}ms` } : undefined
			}
			{...props}
		/>
	);
}
