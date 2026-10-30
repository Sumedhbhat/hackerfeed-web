import type { ReactNode } from "react";

/** Site footer: product name and tagline on one side, copyright on the other. */
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
		<footer className="site-footer px-4 pt-5 pb-8 text-(--sea-ink-soft) sm:pt-8 sm:pb-12">
			<div className="page-wrap">
				<div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<p className="m-0 mb-1 text-base font-semibold tracking-tight text-(--sea-ink)">
							{title}
						</p>
						<p className="m-0 max-w-sm text-sm leading-relaxed">{tagline}</p>
					</div>
					<div className="mt-8 pt-6">
						<p className="m-0 text-xs tracking-wide opacity-50">{copyright}</p>
					</div>
				</div>
			</div>
		</footer>
	);
}
