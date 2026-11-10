import type { InputHTMLAttributes } from "react";

/** The browser's own colour picker, drawn as a well showing the picked colour. */
export function ColorInput(
	props: Omit<
		InputHTMLAttributes<HTMLInputElement>,
		"className" | "style" | "type"
	>,
) {
	return (
		<input
			type="color"
			className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-field-line bg-surface p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
			{...props}
		/>
	);
}
