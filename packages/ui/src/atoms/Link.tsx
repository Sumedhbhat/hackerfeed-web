import { createLink } from "@tanstack/react-router";
import type { AnchorHTMLAttributes } from "react";

const VARIANT_CLASSES = {
	/** Quiet grey link that darkens on hover (secondary actions, "Back"). */
	subtle:
		"rounded-sm text-sm text-ink-soft no-underline hover:text-ink hover:underline",
	accent:
		"rounded-sm text-sm font-medium text-accent-strong no-underline underline-offset-[3px] hover:text-accent-strong hover:underline",
	nav: "min-h-9 gap-1.5 rounded-md px-2 py-1.5 xs:px-2.5 text-sm font-medium whitespace-nowrap text-ink-soft no-underline hover:bg-muted hover:text-ink data-[status=active]:bg-accent-tint data-[status=active]:text-accent-strong sm:px-3",
	inline:
		"text-accent-strong underline decoration-accent/40 underline-offset-[3px] hover:text-accent-strong hover:decoration-accent",
	/** The hit area covers the nearest `position: relative` ancestor (the card). */
	card: "rounded-sm text-inherit no-underline decoration-accent/50 underline-offset-[3px] after:absolute after:inset-0 after:content-[''] hover:text-inherit hover:underline visited:text-ink-soft",
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
			className={`${variant === "inline" || variant === "card" ? "" : "inline-flex items-center gap-1 "}focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${VARIANT_CLASSES[variant]}`}
		/>
	);
}

/** In-app link (`to="/favorites"`) styled as text. */
export const TextLink = createLink(StyledAnchor);

/** AppShell renders this hidden "Opens in a new tab" note once; new-tab links point at it with aria-describedby because the ↗ icon is aria-hidden. */
export const NEW_TAB_NOTE_ID = "opens-in-new-tab";

/** Link to another website, opened in a new tab. */
export function ExternalLink({
	newTab = true,
	...props
}: StyledAnchorProps & { href: string; newTab?: boolean }) {
	return (
		<StyledAnchor
			{...(newTab
				? {
						target: "_blank",
						rel: "noopener noreferrer",
						"aria-describedby": NEW_TAB_NOTE_ID,
					}
				: {})}
			{...props}
		/>
	);
}
