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
			<nav className="page-wrap flex items-center gap-3 px-4 py-3.5 sm:gap-8">
				{brand}
				<div className="flex items-center gap-3 text-xs sm:gap-5 sm:text-sm">
					{links}
				</div>
				<div className="ml-auto flex items-center gap-2">{actions}</div>
			</nav>
		</header>
	);
}
