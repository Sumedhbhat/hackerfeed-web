import { Field } from "@base-ui/react/field";
import { Input } from "@base-ui/react/input";
import { mergeProps } from "@base-ui/react/merge-props";
import type { TextareaHTMLAttributes } from "react";

const FIELD =
	"rounded-md border border-(--field-line) bg-(--surface-strong) text-base text-(--sea-ink) placeholder:text-(--sea-ink-faint) focus-visible:border-(--lagoon) focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-(--lagoon) sm:text-sm";

const INPUT_VARIANT = {
	field: `${FIELD} px-3 py-2`,
	bare: "w-full min-w-0 border-0 bg-transparent text-base text-(--sea-ink) outline-none placeholder:text-(--sea-ink-faint) sm:text-sm",
} as const;

/** A <label>, so a click anywhere in the drawn box (padding, icon) focuses the input. */
export function FieldFrame({
	children,
	grow = false,
	fitsDate = false,
}: {
	children: React.ReactNode;
	grow?: boolean;
	fitsDate?: boolean;
}) {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: the input inside is the control and is named by its aria-label
		<label
			className={`flex min-h-10 cursor-text items-center gap-2 rounded-md border border-(--field-line) bg-(--surface-strong) px-3 text-(--sea-ink-soft) focus-within:border-(--lagoon) focus-within:outline-2 focus-within:outline-(--lagoon) ${grow ? "min-w-0 flex-1" : "shrink-0"} ${fitsDate ? "min-w-[9.5em]" : ""}`}
		>
			{children}
		</label>
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

export function TextArea({
	variant = "field",
	id,
	...props
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className" | "style"> & {
	variant?: keyof typeof INPUT_VARIANT;
}) {
	const look =
		variant === "bare"
			? `${INPUT_VARIANT.bare} resize-none px-2 py-1.5 leading-relaxed`
			: `${FIELD} resize-y px-3 py-2`;
	return (
		<Field.Control
			id={id}
			render={(controlProps) => (
				<textarea
					{...mergeProps<"textarea">(
						controlProps as TextareaHTMLAttributes<HTMLTextAreaElement>,
						props,
					)}
					className={`${look} min-h-11 flex-1`}
				/>
			)}
		/>
	);
}
