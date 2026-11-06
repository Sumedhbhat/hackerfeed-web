import { Input } from "@base-ui/react/input";
import type { TextareaHTMLAttributes } from "react";

const FIELD =
	"rounded-md border border-(--field-line) bg-(--surface-strong) text-base text-(--sea-ink) placeholder:text-(--sea-ink-faint) focus-visible:border-(--lagoon) focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-(--lagoon) sm:text-sm";

const INPUT_VARIANT = {
	field: `${FIELD} px-3 py-2`,
	/** No chrome: the parent draws the field (search boxes, composers). */
	bare: "w-full min-w-0 border-0 bg-transparent text-base text-(--sea-ink) outline-none placeholder:text-(--sea-ink-faint) sm:text-sm",
} as const;

/** Draws the field's border and focus ring around a `bare` input and a leading icon. Give the input its own label. */
export function FieldFrame({
	children,
	grow = false,
}: {
	children: React.ReactNode;
	grow?: boolean;
}) {
	return (
		<div
			className={`flex min-h-10 items-center gap-2 rounded-md border border-(--field-line) bg-(--surface-strong) px-3 text-(--sea-ink-soft) focus-within:border-(--lagoon) focus-within:outline-2 focus-within:outline-(--lagoon) ${grow ? "min-w-0 flex-1" : "shrink-0"}`}
		>
			{children}
		</div>
	);
}

/** Single-line text input. */
export function TextInput({
	variant = "field",
	...props
}: Omit<Input.Props, "className" | "style" | "render"> & {
	variant?: keyof typeof INPUT_VARIANT;
}) {
	return <Input className={INPUT_VARIANT[variant] || undefined} {...props} />;
}

/** Multi-line text input that grows to fill its row. */
export function TextArea({
	variant = "field",
	...props
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className" | "style"> & {
	variant?: keyof typeof INPUT_VARIANT;
}) {
	const look =
		variant === "bare"
			? `${INPUT_VARIANT.bare} resize-none px-2 py-1.5 leading-relaxed`
			: `${FIELD} resize-y px-3 py-2`;
	return <textarea className={`${look} min-h-11 flex-1`} {...props} />;
}
