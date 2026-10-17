import { useId } from "react";
import { Select } from "#/components/atoms/TextField";

type SelectOption = { value: string; label: string };

/** Labelled dropdown that sits inline with other controls, e.g. "Model [GPT-5 ▾]". */
export function SelectField({
	label,
	value,
	options,
	onChange,
	disabled,
}: {
	label: string;
	value: string;
	options: SelectOption[];
	onChange: (value: string) => void;
	disabled?: boolean;
}) {
	const id = useId();
	return (
		<label
			htmlFor={id}
			className="flex items-center gap-2 text-sm text-(--sea-ink-soft)"
		>
			{label}
			<Select
				id={id}
				value={value}
				onChange={(event) => onChange(event.target.value)}
				disabled={disabled}
			>
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</Select>
		</label>
	);
}
