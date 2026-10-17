import { createLink } from "@tanstack/react-router";
import type { AnchorHTMLAttributes } from "react";

const VARIANT_CLASSES = {
	/** Quiet grey link that darkens on hover (secondary actions, "Back"). */
	subtle:
		"text-sm text-(--sea-ink-soft) no-underline transition-colors hover:text-(--sea-ink)",
	/** Orange call-to-action link. */
	accent:
		"text-sm font-medium text-(--lagoon-deep) no-underline underline-offset-2 hover:text-(--lagoon) hover:underline",
	/** Top navigation item; underlined when the router marks it active. */
	nav: "nav-link gap-1.5",
	/** Inherits surrounding text styles; use for linked titles. */
	plain: "text-inherit no-underline hover:underline",
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
			className={`inline-flex items-center gap-1 ${VARIANT_CLASSES[variant]}`}
			{...props}
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
