import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useAuth } from "@workos-inc/authkit-react";
import { useEffect, useRef, useState } from "react";
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
					<UserMenu />
				</div>
			</nav>
		</header>
	);
}

function getInitials(
	firstName: string | null,
	lastName: string | null,
	email: string,
): string {
	const first = firstName?.[0] ?? "";
	const last = lastName?.[0] ?? "";
	if (first || last) return `${first}${last}`.toUpperCase();
	return email[0].toUpperCase();
}

function UserMenu() {
	const { user, isLoading, signOut } = useAuth();
	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		function handleClickOutside(e: MouseEvent) {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [open]);

	if (isLoading) {
		return (
			<div className="h-8 w-8 rounded-full bg-(--chip-bg) border border-(--chip-line) animate-pulse" />
		);
	}

	if (!user) return null;

	const initials = getInitials(user.firstName, user.lastName, user.email);
	const displayName =
		[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

	return (
		<div ref={containerRef} className="relative">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				aria-label="User menu"
				aria-expanded={open}
				className="flex h-8 w-8 items-center justify-center rounded-full bg-(--lagoon) text-white text-xs font-semibold hover:opacity-90 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--lagoon)"
			>
				{initials}
			</button>

			{open ? (
				<div className="absolute right-0 top-full mt-2 min-w-44 rounded-lg border border-(--chip-line) bg-(--header-bg) shadow-lg py-1 z-50">
					<div className="px-3 py-2 text-xs text-(--sea-ink-soft) truncate border-b border-(--line)">
						{displayName}
					</div>
					<button
						type="button"
						onClick={() => signOut()}
						className="w-full text-left px-3 py-2 text-sm text-(--sea-ink) hover:bg-(--chip-bg) transition-colors"
					>
						Sign out
					</button>
				</div>
			) : null}
		</div>
	);
}
