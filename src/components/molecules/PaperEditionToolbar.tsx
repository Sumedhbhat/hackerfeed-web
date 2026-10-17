import { CalendarDays, Search } from "lucide-react";

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
		<section className="papers-toolbar" aria-label="Find a paper edition">
			<label className="papers-search">
				<Search size={16} aria-hidden="true" />
				<input
					type="search"
					value={query}
					onChange={(event) => onQueryChange(event.target.value)}
					placeholder="Search papers, authors, or topics"
					aria-label="Search papers"
				/>
			</label>
			<label className="papers-date">
				<CalendarDays size={16} aria-hidden="true" />
				<input
					type="date"
					value={date}
					onChange={(event) => onDateChange(event.target.value)}
					aria-label="Choose edition date"
				/>
			</label>
		</section>
	);
}
