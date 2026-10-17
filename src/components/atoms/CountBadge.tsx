/** Small number pill, e.g. a count next to a tab label. */
export function CountBadge({ count }: { count: number }) {
	return (
		<span className="rounded-sm border border-(--chip-line) bg-(--chip-bg) px-1.5 py-px text-[0.6rem] font-semibold leading-none tabular-nums text-(--sea-ink-soft)">
			{count}
		</span>
	);
}
