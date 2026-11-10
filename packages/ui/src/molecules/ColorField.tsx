import { useState } from "react";
import { ColorInput } from "../atoms/ColorInput";
import { Field, FieldError, FieldLabel } from "../atoms/Field";
import { TextInput } from "../atoms/TextField";

const HEX = /^#?([0-9a-f]{6})$/i;

/**
 * One colour, picked from the browser's picker or typed as #RRGGBB. Typed text
 * is taken on blur or Enter, and only when it is a full colour.
 */
export function ColorField({
	label,
	value,
	onChange,
}: {
	label: string;
	value: string;
	onChange: (hex: string) => void;
}) {
	const [draft, setDraft] = useState<string | null>(null);
	const invalid = draft !== null && !HEX.test(draft.trim());

	function commit() {
		const typed = draft?.trim().match(HEX);
		if (!typed) return;
		onChange(`#${typed[1].toUpperCase()}`);
		setDraft(null);
	}

	return (
		<Field invalid={invalid}>
			<FieldLabel>{label}</FieldLabel>
			<div className="flex items-center gap-2">
				<ColorInput
					aria-label={`${label}, picker`}
					value={value}
					onChange={(event) => {
						onChange(event.target.value.toUpperCase());
						setDraft(null);
					}}
				/>
				<TextInput
					value={draft ?? value}
					onChange={(event) => setDraft(event.target.value)}
					onBlur={commit}
					onKeyDown={(event) => {
						if (event.key === "Enter") commit();
					}}
					spellCheck={false}
					autoCapitalize="characters"
					maxLength={7}
				/>
			</div>
			{invalid ? (
				<FieldError>Use six letters or digits, like #1E6B52.</FieldError>
			) : null}
		</Field>
	);
}
