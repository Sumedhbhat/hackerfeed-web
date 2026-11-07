import type { ReactNode } from "react";

/** Sticky top bar: brand on the left, navigation links next to it, actions on the far right. */
export function HeaderBar({
	brand,
	links,
	actions,
}: {
	brand: ReactNode;
	links: ReactNode;
	actions: ReactNode;
}) {
	return (
		<header className="sticky top-0 z-50 border-b border-(--line) bg-(--header-bg) backdrop-blur-md">
			{/* Below 360px (e.g. 320px, WCAG 1.4.10) the nav takes its own row instead of sliding under the actions. */}
			<div className="page-wrap flex min-h-14 items-center gap-1.5 px-3 max-[359px]:flex-wrap max-[359px]:py-1.5 xs:gap-2 sm:gap-6 sm:px-6">
				{brand}
				<nav
					aria-label="Main"
					className="flex min-w-0 items-center gap-0.5 max-[359px]:order-last max-[359px]:w-full"
				>
					{links}
				</nav>
				<div className="ml-auto flex shrink-0 items-center gap-1 xs:gap-1.5 sm:gap-2">
					{actions}
				</div>
			</div>
		</header>
	);
}
