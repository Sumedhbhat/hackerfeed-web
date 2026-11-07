/**
 * Small number pill, e.g. a count next to a tab label. `compact` hides it
 * visually on the narrowest phones (under 380px) but keeps it in the
 * accessible name.
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
			className={`${compact ? "max-xs:sr-only " : ""}inline-flex min-w-5 items-center justify-center rounded-full bg-(--bookmark-tint) px-1.5 py-0.5 text-xs font-semibold tabular-nums text-(--bookmark)`}
		>
			{count}
		</span>
	);
}
