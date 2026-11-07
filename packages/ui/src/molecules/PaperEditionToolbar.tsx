import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../atoms/Button";
import { Icon } from "../atoms/Icon";
import { FieldFrame, TextInput } from "../atoms/TextField";
import { SearchField } from "./SearchField";

/** "2026-01-15" moved by whole days, in UTC so a time zone can't skip a day. */
function shiftDay(date: string, days: number): string {
	const day = new Date(`${date}T00:00:00Z`);
	day.setUTCDate(day.getUTCDate() + days);
	return day.toISOString().slice(0, 10);
}

/** Search box, and the edition date with previous/next day buttons, at the top of the papers feed. */
export function PaperEditionToolbar({
	query,
	date,
	onQueryChange,
	onDateChange,
	canGoNext = true,
}: {
	query: string;
	date: string;
	onQueryChange: (query: string) => void;
	onDateChange: (date: string) => void;
	/** False on the latest edition, where there is no next day yet. */
	canGoNext?: boolean;
}) {
	// Typing a date fires a change per segment; only load the edition once the
	// reader leaves the field or presses Enter (WCAG 3.2.2).
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
			{/* Wraps under very large text rather than squeezing the date. */}
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
					// day must not drop keyboard focus to the page (WCAG 2.4.3).
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
