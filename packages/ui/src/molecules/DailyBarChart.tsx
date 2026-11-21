export type DailyBar = {
	key: string;
	/** The day as the table shows it, e.g. "Sat 21 Nov". */
	label: string;
	value: number;
	/** What the bar stands for, shown on hover and in the table, e.g. "3 stories, 1 paper". */
	description: string;
};

/**
 * One bar per day on a zero baseline. The bars are a picture of the table
 * under them, which is what assistive technology reads.
 */
export function DailyBarChart({
	caption,
	bars,
	valueHeader,
}: {
	caption: string;
	bars: DailyBar[];
	valueHeader: string;
}) {
	const max = Math.max(1, ...bars.map((bar) => bar.value));
	const first = bars[0];
	const last = bars.at(-1);

	return (
		<figure className="relative m-0">
			<div
				aria-hidden="true"
				className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-1"
			>
				<div className="flex h-40 flex-col justify-between text-right text-meta text-ink-faint tabular-nums">
					<span className="-mt-2.5">{max}</span>
					<span className="-mb-2.5">0</span>
				</div>
				<div
					className={`flex h-40 items-end border-y border-line ${bars.length > 40 ? "gap-px" : "gap-1"}`}
				>
					{bars.map((bar) => (
						<div
							key={bar.key}
							title={`${bar.label}: ${bar.description}`}
							className="flex h-full min-w-0 flex-1 items-end"
						>
							{bar.value > 0 ? (
								<div
									className="w-full rounded-t-[3px] bg-accent"
									style={{ height: `${(bar.value / max) * 100}%` }}
								/>
							) : null}
						</div>
					))}
				</div>
				<span />
				<div className="flex justify-between gap-2 text-meta text-ink-soft">
					<span>{first?.label}</span>
					{last && last !== first ? <span>{last.label}</span> : null}
				</div>
			</div>
			<div className="sr-only">
				<table>
					<caption>{caption}</caption>
					<thead>
						<tr>
							<th scope="col">Day</th>
							<th scope="col">{valueHeader}</th>
						</tr>
					</thead>
					<tbody>
						{bars.map((bar) => (
							<tr key={bar.key}>
								<th scope="row">{bar.label}</th>
								<td>{bar.description}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</figure>
	);
}
