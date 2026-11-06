import { Search } from "lucide-react";
import { Icon } from "../atoms/Icon";
import { FieldFrame, TextInput } from "../atoms/TextField";

/** Search box and edition date picker at the top of the papers feed. */
export function PaperEditionToolbar({
	query,
	date,
	onQueryChange,
	onDateChange,
}: {
	query: string;
	date: string;
	onQueryChange: (query: string) => void;
	onDateChange: (date: string) => void;
}) {
	return (
		<section
			className="flex flex-col gap-2 sm:flex-row"
			aria-label="Find a paper edition"
		>
			<FieldFrame grow>
				<Icon icon={Search} />
				<TextInput
					variant="bare"
					type="search"
					value={query}
					onChange={(event) => onQueryChange(event.target.value)}
					placeholder="Search papers, authors, or topics"
					aria-label="Search papers"
				/>
			</FieldFrame>
			<FieldFrame>
				<TextInput
					variant="bare"
					type="date"
					value={date}
					onChange={(event) => onDateChange(event.target.value)}
					aria-label="Choose edition date"
				/>
			</FieldFrame>
		</section>
	);
}
