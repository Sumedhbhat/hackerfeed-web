import { Input } from "@base-ui/react/input";
import type { TextareaHTMLAttributes } from "react";

const FIELD =
	"rounded-md border border-(--chip-line) bg-(--surface-strong) text-sm text-(--sea-ink) focus-visible:outline-2 focus-visible:outline-(--lagoon)";

const INPUT_VARIANT = {
	field: `${FIELD} px-3 py-2`,
	bare: "",
} as const;

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
export function TextArea(
	props: Omit<
		TextareaHTMLAttributes<HTMLTextAreaElement>,
		"className" | "style"
	>,
) {
	return (
		<textarea
			className={`${FIELD} min-h-11 flex-1 resize-y px-3 py-2`}
			{...props}
		/>
	);
}
