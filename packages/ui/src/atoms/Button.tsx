import { Button as BaseButton } from "@base-ui/react/button";
import { createLink } from "@tanstack/react-router";
import type { AnchorHTMLAttributes } from "react";

const BASE_CLASSES =
	"inline-flex shrink-0 items-center justify-center gap-1.5 text-sm font-medium no-underline transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--lagoon) disabled:cursor-not-allowed disabled:opacity-55";

const VARIANT_CLASSES = {
	/** The one main action in a view. */
	primary:
		"rounded-md min-h-11 bg-(--lagoon) px-3.5 py-1.5 text-(--on-lagoon) disabled:bg-(--chip-bg) disabled:text-(--sea-ink-faint) disabled:opacity-100 sm:min-h-9 hover:bg-(--lagoon-deep) hover:text-(--on-lagoon)",
	/** A main action that repeats down a list, where a solid button would shout. */
	soft: "rounded-md whitespace-nowrap min-h-11 bg-(--lagoon-tint) px-2.5 py-1.5 text-(--lagoon-deep) hover:bg-(--lagoon) hover:text-(--on-lagoon) sm:min-h-9 sm:px-3",
	/** The main action of a list row: green text, no fill, so a column of rows stays calm. */
	accent:
		"rounded-md whitespace-nowrap min-h-11 min-w-11 px-1.5 py-1.5 font-semibold text-(--lagoon-deep) hover:bg-(--lagoon-tint) hover:text-(--lagoon-deep) sm:min-h-8 sm:min-w-8 sm:px-2",
	/** Bordered button for secondary actions and pick-one chips. */
	secondary:
		"rounded-md min-h-9 border border-(--chip-line) bg-(--surface-strong) justify-start px-3 py-1.5 text-left text-(--sea-ink) hover:border-(--field-line) hover:bg-(--chip-bg) aria-pressed:border-(--lagoon) aria-pressed:bg-(--lagoon-tint) aria-pressed:text-(--lagoon-deep)",
	/** Text-only action; pressed means saved, so it turns brass. */
	ghost:
		"rounded-md whitespace-nowrap min-h-11 min-w-11 px-1.5 py-1.5 font-normal text-(--sea-ink) sm:min-h-8 sm:min-w-8 sm:px-2 hover:bg-(--chip-bg) hover:text-(--sea-ink) aria-pressed:text-(--bookmark) aria-pressed:hover:text-(--bookmark)",
	/** One option in a segmented control (pick one of a few views). */
	segment:
		"rounded-md whitespace-nowrap min-h-8 px-3 py-1 text-(--sea-ink-soft) hover:text-(--sea-ink) aria-pressed:bg-(--surface-strong) aria-pressed:text-(--sea-ink) aria-pressed:shadow-(--shadow-raised)",
	/** A filter chip in a wrapping set. */
	chip: "whitespace-nowrap min-h-9 rounded-full border border-(--chip-line) bg-(--surface-strong) px-3 py-1 font-normal text-(--sea-ink-soft) hover:border-(--field-line) hover:text-(--sea-ink) aria-pressed:border-(--lagoon) aria-pressed:bg-(--lagoon-tint) aria-pressed:font-medium aria-pressed:text-(--lagoon-deep)",
	/** Square icon-only button. */
	icon: "rounded-md h-9 w-9 overflow-hidden border border-(--chip-line) bg-(--surface-strong) text-(--sea-ink-soft) hover:border-(--field-line) hover:text-(--sea-ink)",
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
	return <a {...props} className={buttonClassName(variant)} />;
}

/** In-app link (`to="/profile"`) that looks like a button. */
export const ButtonLink = createLink(ButtonAnchor);

/** Link to another website that looks like a button; opens in a new tab. */
export function ExternalButtonLink(
	props: ButtonAnchorProps & { href: string },
) {
	return <ButtonAnchor target="_blank" rel="noopener noreferrer" {...props} />;
}
