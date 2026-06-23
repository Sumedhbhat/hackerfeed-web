export default function Footer() {
	const year = new Date().getFullYear();

	return (
		<footer className="px-4 pt-5 pb-8 sm:pt-8 sm:pb-12 site-footer text-(--sea-ink-soft)">
			<div className="page-wrap">
				<div className="flex flex-col gap-6 sm:flex-row sm:justify-between sm:items-end">
					<div>
						<p className="m-0 mb-1 text-base font-semibold tracking-tight text-(--sea-ink)">
							HackerFeed
						</p>
						<p className="m-0 max-w-sm text-sm leading-relaxed">
							A clean reader for Hacker News stories and daily research papers.
						</p>
					</div>

					<div className="pt-6 mt-8">
						<p className="m-0 text-xs tracking-wide opacity-50">
							&copy; {year} HackerFeed
						</p>
					</div>
				</div>
			</div>
		</footer>
	);
}
