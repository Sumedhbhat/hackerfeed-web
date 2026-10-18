import type { ReactNode } from "react";

/** Labelled facts in a two-column grid, e.g. "First name: Ada". */
export function DetailList({
	items,
}: {
	items: { label: string; value: ReactNode }[];
}) {
	return (
		<dl className="m-0 grid gap-4 sm:grid-cols-2">
			{items.map((item) => (
				<div key={item.label}>
					<dt className="text-xs font-semibold uppercase text-(--sea-ink-soft)">
						{item.label}
					</dt>
					<dd className="m-0 mt-1 text-sm text-(--sea-ink)">{item.value}</dd>
				</div>
			))}
		</dl>
	);
}
