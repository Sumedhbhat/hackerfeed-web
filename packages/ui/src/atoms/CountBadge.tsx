/** Small number pill, e.g. a count next to a tab label. */
export function CountBadge({ count }: { count: number }) {
	return (
		<span className="inline-flex min-w-5 items-center justify-center rounded-full bg-(--bookmark-tint) px-1.5 py-0.5 text-[0.6875rem] font-semibold leading-none tabular-nums text-(--bookmark)">
			{count}
		</span>
	);
}
