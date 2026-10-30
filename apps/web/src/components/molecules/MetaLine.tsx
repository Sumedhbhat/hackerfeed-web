import { Fragment, type ReactNode } from "react";

/** Uppercase orange line of facts separated by slashes, e.g. "GITHUB.COM / 3 HOURS AGO". */
export function MetaLine({ items }: { items: ReactNode[] }) {
	const visible = items.filter((item) => item != null && item !== "");
	return (
		<div className="mb-2.5 flex flex-wrap items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-(--kicker)">
			{visible.map((item, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: items are positional and never reorder
				<Fragment key={index}>
					{index > 0 ? <span className="opacity-40">/</span> : null}
					<span
						className={index === visible.length - 1 ? "opacity-70" : undefined}
					>
						{item}
					</span>
				</Fragment>
			))}
		</div>
	);
}
