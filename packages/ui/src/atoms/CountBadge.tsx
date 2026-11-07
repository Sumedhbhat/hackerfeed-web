/**
 * Small number pill, e.g. a count next to a tab label. `compact` hides it
 * visually between 360px and 380px, where the header row is tightest, but
 * keeps it in the accessible name. Below 360px (e.g. 400% zoom) the nav has a
 * row of its own, so the count shows again (WCAG 1.4.10).
 */
export function CountBadge({
	count,
	compact = false,
}: {
	count: number;
	compact?: boolean;
}) {
	return (
		<span
			className={`${compact ? "min-[360px]:max-xs:sr-only " : ""}inline-flex min-w-5 items-center justify-center rounded-full bg-(--bookmark-tint) px-1.5 py-0.5 text-xs font-semibold tabular-nums text-(--bookmark)`}
		>
			{count}
		</span>
	);
}
