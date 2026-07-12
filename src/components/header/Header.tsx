import { Link } from "@tanstack/react-router";
import { useAuthSession } from "#/hooks/useAuthSession";
import { useFavorites } from "#/hooks/useFavorites";
import { usePaperFavorites } from "#/hooks/usePaperFavorites";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";

export default function Header() {
	const { count: favCount } = useFavorites();
	const { user } = useAuthSession();
	const { count: paperCount } = usePaperFavorites();
	const totalCount = favCount + (user ? paperCount : 0);

	return (
		<header className="sticky top-0 z-50 border-b border-(--line) bg-(--header-bg) backdrop-blur-md">
			<nav className="page-wrap flex items-center gap-3 py-3.5 px-4 sm:gap-8">
				{/* Logo */}
				<Link
					to="/"
					className="flex flex-shrink-0 items-center gap-2.5 no-underline group"
				>
					{/* Logo icon — mobile only */}
					<img
						src="/logo192.png"
						alt="HackerFeed"
						className="block sm:hidden h-7 w-7 rounded-md"
					/>
					{/* Text logo — sm and up */}
					<span
						className="hidden sm:block h-5 w-[1.5px] bg-(--lagoon) opacity-80 group-hover:opacity-100 transition-opacity"
						aria-hidden="true"
					/>
					<span className="hidden sm:block text-base font-semibold tracking-tight text-(--sea-ink)">
						HackerFeed
					</span>
				</Link>

				{/* Nav links */}
				<div className="flex items-center gap-3 text-xs sm:gap-5 sm:text-sm">
					<Link
						to="/"
						className="nav-link"
						activeProps={{ className: "nav-link is-active" }}
					>
						Feed
					</Link>
					<Link
						to="/papers"
						className="nav-link"
						activeProps={{ className: "nav-link is-active" }}
					>
						Papers
					</Link>
					<Link
						to="/favorites"
						className="nav-link inline-flex items-center gap-1.5"
						activeProps={{
							className: "nav-link is-active inline-flex items-center gap-1.5",
						}}
					>
						Favorites
						{totalCount > 0 ? (
							<span className="rounded-sm bg-(--chip-bg) border border-(--chip-line) px-1.5 py-px text-[0.6rem] font-semibold leading-none text-(--sea-ink-soft) tabular-nums">
								{totalCount}
							</span>
						) : null}
					</Link>
				</div>

				{/* Right side */}
				<div className="ml-auto flex items-center gap-2">
					<ThemeToggle />
					<UserMenu />
				</div>
			</nav>
		</header>
	);
}
