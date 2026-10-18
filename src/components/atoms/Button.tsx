import { Button as BaseButton } from "@base-ui/react/button";
import { createLink } from "@tanstack/react-router";
import type { AnchorHTMLAttributes } from "react";

const BASE_CLASSES =
	"inline-flex shrink-0 items-center gap-1.5 no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--lagoon) cursor-pointer disabled:cursor-not-allowed disabled:opacity-60";

const VARIANT_CLASSES = {
	primary:
		"rounded-md bg-(--lagoon) px-3 py-2 text-sm font-semibold text-white hover:bg-(--lagoon-deep)",
	secondary:
		"rounded-md border border-(--chip-line) px-3 py-2 text-left text-sm font-semibold text-(--sea-ink) hover:bg-(--chip-bg) aria-pressed:border-(--lagoon) aria-pressed:bg-(--chip-bg)",
	ghost:
		"text-sm text-(--sea-ink-soft) hover:text-(--sea-ink) aria-pressed:font-medium aria-pressed:text-(--kicker)",
	icon: "h-8 w-8 justify-center overflow-hidden rounded-full border border-(--chip-line) bg-(--chip-bg) text-(--sea-ink) hover:border-(--sea-ink-soft) hover:bg-(--link-bg-hover)",
} as const;

export type ButtonVariant = keyof typeof VARIANT_CLASSES;

export function buttonClassName(variant: ButtonVariant = "primary"): string {
	return `${BASE_CLASSES} ${VARIANT_CLASSES[variant]}`;
}

type ButtonProps = Omit<BaseButton.Props, "className" | "style" | "render"> & {
	variant?: ButtonVariant;
};

export function Button({
	variant = "primary",
	type = "button",
	...props
}: ButtonProps) {
	return (
		<BaseButton type={type} className={buttonClassName(variant)} {...props} />
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
	return <a className={buttonClassName(variant)} {...props} />;
}

/** In-app link (`to="/profile"`) that looks like a button. */
export const ButtonLink = createLink(ButtonAnchor);

/** Link to another website that looks like a button; opens in a new tab. */
export function ExternalButtonLink(
	props: ButtonAnchorProps & { href: string },
) {
	return <ButtonAnchor target="_blank" rel="noopener noreferrer" {...props} />;
}
