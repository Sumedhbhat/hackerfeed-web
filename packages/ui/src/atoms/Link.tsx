import { createLink } from "@tanstack/react-router";
import type { AnchorHTMLAttributes } from "react";

const VARIANT_CLASSES = {
	/** Quiet grey link that darkens on hover (secondary actions, "Back"). */
	subtle:
		"rounded-sm text-sm text-(--sea-ink-soft) no-underline hover:text-(--sea-ink) hover:underline",
	/** Green call-to-action link standing on its own (not inside a sentence); underlined on hover. */
	accent:
		"rounded-sm text-sm font-medium text-(--lagoon-deep) no-underline underline-offset-[3px] hover:text-(--lagoon-deep) hover:underline",
	/** Top navigation item; tinted when the router marks it active. */
	nav: "min-h-9 gap-1.5 rounded-md px-2 py-1.5 xs:px-2.5 text-sm font-medium whitespace-nowrap text-(--sea-ink-soft) no-underline hover:bg-(--chip-bg) hover:text-(--sea-ink) data-[status=active]:bg-(--lagoon-tint) data-[status=active]:text-(--lagoon-deep) sm:px-3",
	/** A link inside text or a line of facts: green and always underlined, so it reads as a link, not more text. */
	inline:
		"text-(--lagoon-deep) underline decoration-(--lagoon)/40 underline-offset-[3px] hover:text-(--lagoon-deep) hover:decoration-(--lagoon)",
	/** Inherits surrounding text styles; use for linked titles. */
	plain:
		"rounded-sm text-inherit no-underline decoration-(--lagoon)/50 underline-offset-[3px] hover:text-inherit hover:underline visited:text-(--sea-ink-soft)",
} as const;

export type LinkVariant = keyof typeof VARIANT_CLASSES;

type StyledAnchorProps = Omit<
	AnchorHTMLAttributes<HTMLAnchorElement>,
	"className" | "style"
> & {
	variant?: LinkVariant;
	ref?: React.Ref<HTMLAnchorElement>;
};

function StyledAnchor({ variant = "subtle", ...props }: StyledAnchorProps) {
	return (
		<a
			{...props}
			className={`${variant === "inline" || variant === "plain" ? "" : "inline-flex items-center gap-1 "}focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--lagoon) ${VARIANT_CLASSES[variant]}`}
		/>
	);
}

/** In-app link (`to="/favorites"`) styled as text. */
export const TextLink = createLink(StyledAnchor);

/** Link to another website, opened in a new tab. */
export function ExternalLink({
	newTab = true,
	...props
}: StyledAnchorProps & { href: string; newTab?: boolean }) {
	return (
		<StyledAnchor
			{...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
			{...props}
		/>
	);
}
