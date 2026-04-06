import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { favoritesStore } from "#/lib/favorites-store";
import ThemeToggle from "./ThemeToggle";
import WorkOSHeader from "./workos-user.tsx";

export default function Header() {
	const favCount = useStore(favoritesStore, (state) => state.items.size);

	return (
		<header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg">
			<nav className="page-wrap flex flex-wrap items-center gap-x-3 gap-y-2 py-3 sm:py-4">
				<h2 className="m-0 flex-shrink-0 text-base font-semibold tracking-tight">
					<Link
						to="/"
						className="inline-flex items-center gap-2 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm text-[var(--sea-ink)] no-underline shadow-[0_8px_24px_rgba(30,90,72,0.08)] sm:px-4 sm:py-2"
					>
						<span className="h-2 w-2 rounded-full bg-[linear-gradient(90deg,#56c6be,#7ed3bf)]" />
						HackerFeed
					</Link>
				</h2>

				<div className="ml-auto flex items-center gap-1.5 sm:ml-0 sm:gap-2">
					<a
						href="https://news.ycombinator.com/news"
						target="_blank"
						rel="noreferrer"
						className="hidden rounded-xl p-2 text-[var(--sea-ink-soft)] transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)] sm:block"
					>
						<span className="sr-only">Open Hacker News</span>
						<svg viewBox="0 0 24 24" aria-hidden="true" width="24" height="24">
							<path
								fill="currentColor"
								d="M4 5.5A1.5 1.5 0 0 1 5.5 4h7a1 1 0 1 1 0 2h-7a.5.5 0 0 0-.5.5v12a.5.5 0 0 0 .5.5h12a.5.5 0 0 0 .5-.5v-7a1 1 0 1 1 2 0v7a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4 18.5v-13Zm8-1.5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0V6.41l-8.3 8.3a1 1 0 0 1-1.4-1.42L16.59 5H13a1 1 0 0 1-1-1Z"
							/>
						</svg>
					</a>
					<a
						href="https://github.com/HackerNews/API"
						target="_blank"
						rel="noreferrer"
						className="hidden rounded-xl p-2 text-[var(--sea-ink-soft)] transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)] sm:block"
					>
						<span className="sr-only">View Hacker News API docs</span>
						<svg viewBox="0 0 16 16" aria-hidden="true" width="24" height="24">
							<path
								fill="currentColor"
								d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"
							/>
						</svg>
					</a>
					<WorkOSHeader />

					<ThemeToggle />
				</div>

				<div className="order-3 flex w-full flex-wrap items-center gap-x-4 gap-y-1 pb-1 text-sm font-semibold sm:order-2 sm:w-auto sm:flex-nowrap sm:pb-0">
					<Link
						to="/"
						className="nav-link"
						activeProps={{ className: "nav-link is-active" }}
					>
						Feed
					</Link>
					<Link
						to="/favorites"
						className="nav-link inline-flex items-center gap-1.5"
						activeProps={{
							className: "nav-link is-active inline-flex items-center gap-1.5",
						}}
					>
						Favorites
						{favCount > 0 ? (
							<span className="rounded-full bg-[rgba(79,184,178,0.22)] border border-[rgba(50,143,151,0.35)] px-1.5 py-0.5 text-[0.65rem] font-bold leading-none text-[var(--lagoon-deep)]">
								{favCount}
							</span>
						) : null}
					</Link>
					<a
						href="https://news.ycombinator.com/newest"
						className="nav-link"
						target="_blank"
						rel="noreferrer"
					>
						Newest
					</a>
					<a
						href="https://news.ycombinator.com/best"
						className="nav-link"
						target="_blank"
						rel="noreferrer"
					>
						Best
					</a>
					<a
						href="https://github.com/HackerNews/API"
						className="nav-link"
						target="_blank"
						rel="noreferrer"
					>
						API
					</a>
				</div>
			</nav>
		</header>
	);
}
