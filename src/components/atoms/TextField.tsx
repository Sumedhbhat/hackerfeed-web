import type {
	InputHTMLAttributes,
	SelectHTMLAttributes,
	TextareaHTMLAttributes,
} from "react";

const FIELD =
	"rounded-md border border-(--chip-line) bg-(--surface-strong) text-sm text-(--sea-ink) focus-visible:outline-2 focus-visible:outline-(--lagoon)";

/** Single-line text input. */
export function TextInput(
	props: Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "style">,
) {
	return <input className={`${FIELD} px-3 py-2`} {...props} />;
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

/** Native dropdown. */
export function Select(
	props: Omit<SelectHTMLAttributes<HTMLSelectElement>, "className" | "style">,
) {
	return <select className={`${FIELD} px-2 py-1`} {...props} />;
}
