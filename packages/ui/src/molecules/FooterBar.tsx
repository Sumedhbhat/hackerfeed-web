import type { ReactNode } from "react";

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
		<footer className="border-t border-(--line) py-6 text-sm text-(--sea-ink-faint)">
			<div className="page-wrap flex flex-col gap-1 px-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 sm:px-6">
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
