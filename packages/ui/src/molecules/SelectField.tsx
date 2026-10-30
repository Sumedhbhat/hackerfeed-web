import {
	Select,
	SelectLabel,
	type SelectOption,
	SelectOptions,
	SelectTrigger,
} from "../atoms/Select";

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
	return (
		<Select
			value={value}
			options={options}
			onValueChange={onChange}
			disabled={disabled}
		>
			<div className="flex items-center gap-2">
				<SelectLabel>{label}</SelectLabel>
				<SelectTrigger />
			</div>
			<SelectOptions options={options} />
		</Select>
	);
}
