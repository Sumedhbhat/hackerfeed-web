/**
 * `compact` hides the count visually (not from the accessible name) only
 * between 360px and 380px, where the header row is tightest. Below 360px the
 * nav has a row of its own, so the count shows again.
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
			className={`${compact ? "min-[360px]:max-xs:sr-only " : ""}inline-flex min-w-5 items-center justify-center rounded-full bg-bookmark-tint px-1.5 py-0.5 text-xs font-semibold tabular-nums text-bookmark`}
		>
			{count}
		</span>
	);
}
