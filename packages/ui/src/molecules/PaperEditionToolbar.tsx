import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "../atoms/Button";
import { Icon } from "../atoms/Icon";
import { FieldFrame, TextInput } from "../atoms/TextField";

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
					placeholder="Search papers"
					aria-label="Search papers"
				/>
			</FieldFrame>
			<div className="flex items-center gap-1">
				<Button
					variant="icon"
					aria-label="Previous day"
					disabled={!date}
					onClick={() => onDateChange(shiftDay(date, -1))}
				>
					<Icon icon={ChevronLeft} />
				</Button>
				<FieldFrame grow>
					<TextInput
						variant="bare"
						type="date"
						value={date}
						onChange={(event) => onDateChange(event.target.value)}
						aria-label="Choose edition date"
					/>
				</FieldFrame>
				<Button
					variant="icon"
					aria-label="Next day"
					disabled={!date || !canGoNext}
					onClick={() => onDateChange(shiftDay(date, 1))}
				>
					<Icon icon={ChevronRight} />
				</Button>
			</div>
		</section>
	);
}
