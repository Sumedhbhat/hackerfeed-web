import { type ReactNode, useEffect, useRef } from "react";

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
	// Publish the header's real height for `scroll-padding-top` (styles.css),
	// so focused content lands below it however tall it wraps.
	const headerRef = useRef<HTMLElement>(null);
	useEffect(() => {
		const header = headerRef.current;
		if (!header || typeof ResizeObserver === "undefined") return;
		const root = document.documentElement;
		// Not sticky on short screens (it would take a third of the view), so nothing to clear then.
		const update = () =>
			root.style.setProperty(
				"--header-height",
				getComputedStyle(header).position === "sticky"
					? `${header.offsetHeight}px`
					: "0px",
			);
		const observer = new ResizeObserver(update);
		observer.observe(header);
		window.addEventListener("resize", update);
		return () => {
			observer.disconnect();
			window.removeEventListener("resize", update);
			root.style.removeProperty("--header-height");
		};
	}, []);
	return (
		<header
			ref={headerRef}
			className="sticky top-0 z-50 [@media(max-height:500px)]:static border-b border-(--line) bg-(--header-bg) backdrop-blur-md"
		>
			{/* Below 360px the nav takes its own row. Above that its links wrap rather
			    than slide under the actions. */}
			<div className="page-wrap flex min-h-14 items-center gap-1.5 px-3 flex-wrap max-[359px]:py-1.5 sm:gap-6 sm:px-6">
				{brand}
				<nav
					aria-label="Main"
					className="flex flex-wrap items-center gap-0.5 max-[359px]:order-last max-[359px]:w-full"
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
