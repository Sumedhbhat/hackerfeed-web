import { Input } from "@base-ui/react/input";

const FIELD =
	"rounded-md border border-field-line bg-surface text-base text-ink placeholder:text-ink-faint focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent sm:text-sm";

const INPUT_VARIANT = {
	field: `${FIELD} px-3 py-2`,
	bare: "w-full min-w-0 border-0 bg-transparent text-base text-ink outline-none placeholder:text-ink-faint sm:text-sm",
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
			className={`flex min-h-10 cursor-text items-center gap-2 rounded-md border border-field-line bg-surface px-3 text-ink-soft focus-within:border-accent focus-within:outline-2 focus-within:outline-accent ${grow ? "min-w-0 flex-1" : "shrink-0"} ${fitsDate ? "min-w-[9.5em]" : ""}`}
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
