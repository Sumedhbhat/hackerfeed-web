import { Button as BaseButton } from "@base-ui/react/button";
import { createLink } from "@tanstack/react-router";
import type { AnchorHTMLAttributes } from "react";
import { NEW_TAB_NOTE_ID } from "./Link";

const BASE_CLASSES =
	"inline-flex shrink-0 items-center justify-center gap-1.5 text-sm font-medium no-underline transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent data-disabled:cursor-not-allowed data-disabled:opacity-55";

const VARIANT_CLASSES = {
	/** The transparent border is drawn in forced colours, where the fill is removed. */
	primary:
		"rounded-md min-h-11 max-w-full border border-transparent bg-accent px-3.5 py-1.5 text-on-accent data-disabled:bg-muted data-disabled:text-ink-faint data-disabled:opacity-100 sm:min-h-9 hover:bg-accent-strong hover:text-on-accent",
	soft: "rounded-md whitespace-nowrap min-h-11 border border-transparent bg-accent-tint px-2.5 py-1.5 text-accent-strong hover:bg-accent hover:text-on-accent sm:min-h-9 sm:px-3",
	accent:
		"rounded-md whitespace-nowrap min-h-11 min-w-11 px-1.5 py-1.5 font-semibold text-accent-strong hover:bg-accent-tint hover:text-accent-strong sm:min-h-8 sm:min-w-8 sm:px-2",
	secondary:
		"rounded-md min-h-9 border border-muted-line bg-surface justify-start px-3 py-1.5 text-left text-ink hover:border-field-line hover:bg-muted aria-pressed:border-accent aria-pressed:bg-accent-tint aria-pressed:text-accent-strong",
	ghost:
		"rounded-md whitespace-nowrap min-h-11 min-w-11 px-1.5 py-1.5 font-normal text-ink-soft sm:min-h-8 sm:min-w-8 sm:px-2 hover:bg-muted hover:text-ink focus-visible:text-ink aria-pressed:text-bookmark aria-pressed:hover:bg-bookmark-tint-strong aria-pressed:hover:text-bookmark",
	segment:
		"rounded-md whitespace-nowrap min-h-8 border border-transparent px-3 py-1 text-ink-soft hover:text-ink aria-pressed:border-accent aria-pressed:bg-surface aria-pressed:text-ink aria-pressed:shadow-(--shadow-raised) forced-colors:aria-pressed:outline-2 forced-colors:aria-pressed:outline-[Highlight]",
	chip: "whitespace-nowrap min-h-9 rounded-full border border-muted-line bg-surface px-3 py-1 font-normal text-ink-soft hover:border-field-line hover:text-ink aria-pressed:border-accent aria-pressed:bg-accent-tint aria-pressed:font-medium aria-pressed:text-accent-strong forced-colors:aria-pressed:outline-2 forced-colors:aria-pressed:outline-offset-1 forced-colors:aria-pressed:outline-[Highlight]",
	quiet:
		"rounded-md whitespace-nowrap min-h-11 min-w-11 px-1.5 py-1.5 font-normal text-ink-faint sm:min-h-8 sm:min-w-8 sm:px-2 hover:bg-muted hover:text-ink focus-visible:text-ink",
	icon: "rounded-md h-11 w-11 sm:h-9 sm:w-9 overflow-hidden border border-muted-line bg-surface text-ink-soft hover:border-field-line hover:text-ink",
} as const;

export type ButtonVariant = keyof typeof VARIANT_CLASSES;

export function buttonClassName(variant: ButtonVariant = "primary"): string {
	return `${BASE_CLASSES} ${VARIANT_CLASSES[variant]}`;
}

type ButtonProps = Omit<BaseButton.Props, "className" | "style" | "render"> & {
	variant?: ButtonVariant;
	/** Unavailable but still focusable, so pressing it doesn't drop keyboard focus to <body>. Use this, not `disabled`, while pending. */
	busy?: boolean;
};

export function Button({
	variant = "primary",
	type = "button",
	busy = false,
	disabled,
	focusableWhenDisabled,
	...props
}: ButtonProps) {
	return (
		<BaseButton
			type={type}
			className={buttonClassName(variant)}
			disabled={disabled || busy}
			focusableWhenDisabled={focusableWhenDisabled || busy}
			aria-busy={busy || undefined}
			{...props}
		/>
	);
}

type ButtonAnchorProps = Omit<
	AnchorHTMLAttributes<HTMLAnchorElement>,
	"className" | "style"
> & {
	variant?: ButtonVariant;
	ref?: React.Ref<HTMLAnchorElement>;
};

function ButtonAnchor({ variant = "primary", ...props }: ButtonAnchorProps) {
	return <a {...props} className={buttonClassName(variant)} />;
}

/** In-app link (`to="/profile"`) that looks like a button. */
export const ButtonLink = createLink(ButtonAnchor);

/** Link to another website that looks like a button; opens in a new tab. */
export function ExternalButtonLink(
	props: ButtonAnchorProps & { href: string },
) {
	return (
		<ButtonAnchor
			target="_blank"
			rel="noopener noreferrer"
			aria-describedby={NEW_TAB_NOTE_ID}
			{...props}
		/>
	);
}
