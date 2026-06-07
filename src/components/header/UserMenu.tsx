import { useUserMenu } from "#/hooks/useUserMenu";

export default function UserMenu() {
	const {
		open,
		setOpen,
		containerRef,
		user,
		isLoading,
		signOut,
		initials,
		displayName,
	} = useUserMenu();

	if (isLoading) {
		return (
			<div className="h-8 w-8 rounded-full bg-(--chip-bg) border border-(--chip-line) animate-pulse" />
		);
	}

	if (!user) return null;

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
