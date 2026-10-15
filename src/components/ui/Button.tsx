import type { ButtonHTMLAttributes } from "react";

/**
 * The only button looks in the app. Add a variant here rather than styling a
 * one-off button inline. Apply `buttonClassName` to links (`<a>`, `<Link>`).
 */
const VARIANT_CLASSES = {
	primary: "bg-(--lagoon) text-white hover:bg-(--lagoon-deep)",
	secondary:
		"border border-(--chip-line) text-(--sea-ink) hover:bg-(--chip-bg)",
} as const;

export type ButtonVariant = keyof typeof VARIANT_CLASSES;

const BASE_CLASSES =
	"inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--lagoon) disabled:opacity-60";

export function buttonClassName(variant: ButtonVariant = "primary"): string {
	return `${BASE_CLASSES} ${VARIANT_CLASSES[variant]}`;
}

type ButtonProps = Omit<
	ButtonHTMLAttributes<HTMLButtonElement>,
	"className"
> & {
	variant?: ButtonVariant;
};

export function Button({
	variant = "primary",
	type = "button",
	...props
}: ButtonProps) {
	return <button type={type} className={buttonClassName(variant)} {...props} />;
}
