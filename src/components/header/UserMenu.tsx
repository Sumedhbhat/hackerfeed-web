import { LogOut } from "lucide-react";
import { useState } from "react";
import { useUserMenu } from "#/hooks/useUserMenu";

function UserAvatar({
	imageUrl,
	initials,
	displayName,
	size = "sm",
}: {
	imageUrl: string | null;
	initials: string;
	displayName: string;
	size?: "sm" | "lg";
}) {
	const [imageFailed, setImageFailed] = useState(false);
	const sizeClass = size === "lg" ? "h-11 w-11 text-sm" : "h-8 w-8 text-xs";
	const baseClass = `${sizeClass} flex shrink-0 items-center justify-center rounded-full border border-(--chip-line) bg-(--lagoon) text-white font-semibold`;

	if (imageUrl && !imageFailed) {
		return (
			<img
				src={imageUrl}
				alt={displayName}
				onError={() => setImageFailed(true)}
				className={`${sizeClass} shrink-0 rounded-full border border-(--chip-line) object-cover bg-(--chip-bg)`}
			/>
		);
	}

	return <span className={baseClass}>{initials}</span>;
}

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
				className="rounded-full hover:opacity-90 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--lagoon)"
			>
				<UserAvatar
					imageUrl={user.profilePictureUrl}
					initials={initials}
					displayName={displayName}
				/>
			</button>

			{open ? (
				<div className="absolute right-0 top-full z-50 mt-2 w-[min(18rem,calc(100vw-1.5rem))] rounded-lg border border-(--chip-line) bg-(--surface-strong) shadow-lg">
					<div className="flex items-center gap-3 border-b border-(--line) p-3">
						<UserAvatar
							imageUrl={user.profilePictureUrl}
							initials={initials}
							displayName={displayName}
							size="lg"
						/>
						<div className="min-w-0">
							<div className="truncate text-sm font-semibold text-(--sea-ink)">
								{displayName}
							</div>
							<div className="truncate text-xs text-(--sea-ink-soft)">
								{user.email}
							</div>
						</div>
					</div>

					<div className="p-1.5">
						<button
							type="button"
							onClick={() => signOut()}
							className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium text-(--sea-ink) hover:bg-(--chip-bg) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--lagoon)"
						>
							<LogOut size={15} aria-hidden="true" />
							Log out
						</button>
					</div>
				</div>
			) : null}
		</div>
	);
}
