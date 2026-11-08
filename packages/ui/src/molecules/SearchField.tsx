import { Search } from "lucide-react";
import { Icon } from "../atoms/Icon";
import { FieldFrame, TextInput } from "../atoms/TextField";

export function SearchField({
	value,
	onChange,
	label,
	placeholder,
}: {
	value: string;
	onChange: (value: string) => void;
	label: string;
	placeholder?: string;
}) {
	return (
		<FieldFrame grow>
			<Icon icon={Search} />
			<TextInput
				variant="bare"
				type="search"
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder={placeholder}
				aria-label={label}
			/>
		</FieldFrame>
	);
}
