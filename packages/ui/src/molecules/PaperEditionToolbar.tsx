import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../atoms/Button";
import { Icon } from "../atoms/Icon";
import { FieldFrame, TextInput } from "../atoms/TextField";
import { SearchField } from "./SearchField";

/** In UTC so a time zone or DST change can't skip a day. */
function shiftDay(date: string, days: number): string {
	const day = new Date(`${date}T00:00:00Z`);
	day.setUTCDate(day.getUTCDate() + days);
	return day.toISOString().slice(0, 10);
}

export function PaperEditionToolbar({
	query,
	date,
	onQueryChange,
	onDateChange,
	canGoNext = true,
	latestDate,
}: {
	query: string;
	date: string;
	onQueryChange: (query: string) => void;
	onDateChange: (date: string) => void;
	canGoNext?: boolean;
	latestDate?: string;
}) {
	// Typing a date fires a change per segment; only load the edition once the
	// reader leaves the field or presses Enter.
	const [draft, setDraft] = useState(date);
	useEffect(() => setDraft(date), [date]);
	const commit = () => {
		if (draft !== date) onDateChange(draft);
	};
	return (
		<section
			className="flex flex-col gap-2 sm:flex-row"
			aria-label="Find a paper edition"
		>
			<SearchField
				value={query}
				onChange={onQueryChange}
				label="Search papers"
				placeholder="Search papers"
			/>
			<div className="flex flex-wrap items-center gap-1">
				<Button
					variant="icon"
					aria-label="Previous day"
					disabled={!date}
					onClick={() => onDateChange(shiftDay(date, -1))}
				>
					<Icon icon={ChevronLeft} />
				</Button>
				<FieldFrame grow fitsDate>
					<TextInput
						variant="bare"
						type="date"
						max={latestDate}
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						onBlur={commit}
						onKeyDown={(event) => {
							if (event.key === "Enter") commit();
						}}
						aria-label="Choose edition date"
					/>
				</FieldFrame>
				<Button
					variant="icon"
					aria-label="Next day"
					// Stays focusable on the latest edition: pressing it to reach that
					// day must not drop keyboard focus to <body>.
					disabled={!date || !canGoNext}
					focusableWhenDisabled
					onClick={() => onDateChange(shiftDay(date, 1))}
				>
					<Icon icon={ChevronRight} />
				</Button>
			</div>
		</section>
	);
}
