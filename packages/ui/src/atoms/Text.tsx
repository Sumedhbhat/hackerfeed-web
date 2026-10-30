import type { ReactNode } from "react";

const SIZE = {
	xs: "text-xs",
	sm: "text-sm",
	base: "text-base",
} as const;

const TONE = {
	default: "text-(--sea-ink)",
	soft: "text-(--sea-ink-soft)",
	faint: "text-(--sea-ink-soft) opacity-70",
	accent: "text-(--kicker)",
} as const;

const WEIGHT = {
	normal: "",
	medium: "font-medium",
	semibold: "font-semibold",
} as const;

type TextProps = {
	children: ReactNode;
	as?: "p" | "span" | "div" | "output";
	size?: keyof typeof SIZE;
	tone?: keyof typeof TONE;
	weight?: keyof typeof WEIGHT;
	/** Relaxed line height for paragraphs of copy. */
	relaxed?: boolean;
	italic?: boolean;
	/** Cut off with an ellipsis instead of wrapping. */
	truncate?: boolean;
	/** Cap the line length for readable copy. */
	measure?: "sm" | "md" | "lg";
	id?: string;
	role?: string;
	"aria-live"?: "polite" | "assertive" | "off";
};

const MEASURE = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg" } as const;

/** Body copy. Pick a size and tone instead of styling text by hand. */
export function Text({
	as: Element = "p",
	size = "sm",
	tone = "default",
	weight = "normal",
	relaxed = false,
	italic = false,
	truncate = false,
	measure,
	...props
}: TextProps) {
	const className = [
		"m-0",
		SIZE[size],
		TONE[tone],
		WEIGHT[weight],
		relaxed && "leading-relaxed",
		italic && "italic",
		truncate && "truncate",
		measure && MEASURE[measure],
	]
		.filter(Boolean)
		.join(" ");
	return <Element className={className} {...props} />;
}
