import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { favoritesStore } from "#/lib/favorites-store";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
	const favCount = useStore(favoritesStore, (state) => state.items.size);

	return (
		<header className="sticky top-0 z-50 border-b border-(--line) bg-(--header-bg) backdrop-blur-md">
			<nav className="page-wrap flex items-center gap-8 py-3.5 px-4">
				{/* Logo */}
				<Link
					to="/"
					className="flex flex-shrink-0 items-center gap-2.5 no-underline group"
				>
					<span
						className="h-5 w-[1.5px] bg-(--lagoon) opacity-80 group-hover:opacity-100 transition-opacity"
						aria-hidden="true"
					/>
					<span className="text-base font-semibold tracking-tight text-(--sea-ink)">
						HackerFeed
					</span>
				</Link>

				{/* Nav links */}
				<div className="flex items-center gap-5 text-sm">
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
							<span className="rounded-sm bg-(--chip-bg) border border-(--chip-line) px-1.5 py-px text-[0.6rem] font-semibold leading-none text-(--sea-ink-soft) tabular-nums">
								{favCount}
							</span>
						) : null}
					</Link>
				</div>

				{/* Right side */}
				<div className="ml-auto flex items-center gap-2">
					<ThemeToggle />
				</div>
			</nav>
		</header>
	);
}
