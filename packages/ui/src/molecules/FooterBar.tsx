import type { ReactNode } from "react";

/** Quiet site footer: product name and tagline on one side, copyright on the other. */
export function FooterBar({
	title,
	tagline,
	copyright,
}: {
	title: ReactNode;
	tagline: ReactNode;
	copyright: ReactNode;
}) {
	return (
		<footer className="border-t border-(--line) px-4 py-6 text-sm text-(--sea-ink-faint) sm:px-6">
			<div className="page-wrap flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
				<p className="m-0 flex flex-col sm:flex-row sm:gap-3">
					<span className="font-serif font-semibold text-(--sea-ink-soft)">
						{title}
					</span>
					<span>{tagline}</span>
				</p>
				<p className="m-0">{copyright}</p>
			</div>
		</footer>
	);
}
