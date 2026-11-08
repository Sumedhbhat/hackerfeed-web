import type { ReactNode } from "react";

const SIZE = {
	xs: "text-meta",
	sm: "text-sm",
	/** Keep the size the parent set (e.g. inside a chat reply). */
	inherit: "",
} as const;

const TONE = {
	default: "text-(--sea-ink)",
	soft: "text-(--sea-ink-soft)",
	faint: "text-(--sea-ink-faint)",
} as const;

const WEIGHT = {
	normal: "",
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
	/** Long unbroken text (an email) wraps anywhere instead of overflowing; never cut off (WCAG 1.4.10). */
	breakAnywhere?: boolean;
	/** Cap the line length for readable copy. */
	measure?: "sm" | "md" | "lg";
	id?: string;
	role?: string;
	"aria-live"?: "polite" | "assertive" | "off";
};

const MEASURE = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-prose" } as const;

/** Body copy. Pick a size and tone instead of styling text by hand. */
export function Text({
	as: Element = "p",
	size = "sm",
	tone = "default",
	weight = "normal",
	relaxed = false,
	italic = false,
	breakAnywhere = false,
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
		breakAnywhere && "min-w-0 [overflow-wrap:anywhere]",
		measure && MEASURE[measure],
	]
		.filter(Boolean)
		.join(" ");
	return <Element className={className} {...props} />;
}
