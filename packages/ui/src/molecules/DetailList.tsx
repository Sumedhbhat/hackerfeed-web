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
					<dt className="text-[0.8125rem] text-(--sea-ink-soft)">
						{item.label}
					</dt>
					<dd className="m-0 mt-0.5 text-[0.9375rem] font-medium text-(--sea-ink)">
						{item.value}
					</dd>
				</div>
			))}
		</dl>
	);
}
