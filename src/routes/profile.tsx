import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, User } from "lucide-react";
import { signIn, useAuthSession } from "#/hooks/useAuthSession";

export const Route = createFileRoute("/profile")({
	component: ProfilePage,
});

function getDisplayName(
	firstName: string | null,
	lastName: string | null,
	email: string,
) {
	return [firstName, lastName].filter(Boolean).join(" ") || email;
}

function getInitials(
	firstName: string | null,
	lastName: string | null,
	email: string,
) {
	const first = firstName?.[0] ?? "";
	const last = lastName?.[0] ?? "";
	if (first || last) return `${first}${last}`.toUpperCase();
	return email[0].toUpperCase();
}

function ProfilePage() {
	const { user, isLoading } = useAuthSession();

	if (isLoading) {
		return (
			<main className="page-wrap min-h-[calc(100vh-9rem)] px-4 py-8">
				<div className="mx-auto max-w-2xl rounded-lg border border-(--line) bg-(--surface-strong) p-5">
					<div className="h-20 w-20 rounded-full bg-(--chip-bg) animate-pulse" />
					<div className="mt-5 h-6 w-48 rounded bg-(--chip-bg) animate-pulse" />
					<div className="mt-3 h-4 w-64 rounded bg-(--chip-bg) animate-pulse" />
				</div>
			</main>
		);
	}

	if (!user) {
		return (
			<main className="page-wrap min-h-[calc(100vh-9rem)] px-4 py-8">
				<section className="mx-auto max-w-2xl rounded-lg border border-(--line) bg-(--surface-strong) p-5">
					<div className="flex h-11 w-11 items-center justify-center rounded-full border border-(--chip-line) bg-(--chip-bg) text-(--sea-ink-soft)">
						<User size={20} aria-hidden="true" />
					</div>
					<h1 className="mt-4 text-xl font-semibold text-(--sea-ink)">
						Profile
					</h1>
					<p className="mt-2 text-sm leading-6 text-(--sea-ink-soft)">
						Sign in to view your HackerFeed profile.
					</p>
					<button
						type="button"
						onClick={() => signIn("/profile")}
						className="mt-5 rounded-md bg-(--lagoon) px-3 py-2 text-sm font-semibold text-white hover:bg-(--lagoon-deep) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--lagoon)"
					>
						Sign in
					</button>
				</section>
			</main>
		);
	}

	const displayName = getDisplayName(user.firstName, user.lastName, user.email);
	const initials = getInitials(user.firstName, user.lastName, user.email);

	return (
		<main className="page-wrap min-h-[calc(100vh-9rem)] px-4 py-8">
			<section className="mx-auto max-w-2xl rounded-lg border border-(--line) bg-(--surface-strong) p-5">
				<div className="flex flex-col gap-5 sm:flex-row sm:items-center">
					{user.profilePictureUrl ? (
						<img
							src={user.profilePictureUrl}
							alt={displayName}
							className="h-20 w-20 rounded-full border border-(--chip-line) object-cover bg-(--chip-bg)"
						/>
					) : (
						<div className="flex h-20 w-20 items-center justify-center rounded-full border border-(--chip-line) bg-(--lagoon) text-xl font-semibold text-white">
							{initials}
						</div>
					)}
					<div className="min-w-0">
						<p className="island-kicker">Profile</p>
						<h1 className="mt-1 truncate text-2xl font-semibold text-(--sea-ink)">
							{displayName}
						</h1>
						<div className="mt-2 flex min-w-0 items-center gap-2 text-sm text-(--sea-ink-soft)">
							<Mail size={15} aria-hidden="true" className="shrink-0" />
							<span className="truncate">{user.email}</span>
						</div>
					</div>
				</div>

				<div className="mt-6 border-t border-(--line) pt-5">
					<dl className="grid gap-4 sm:grid-cols-2">
						<div>
							<dt className="text-xs font-semibold uppercase text-(--sea-ink-soft)">
								First name
							</dt>
							<dd className="mt-1 text-sm text-(--sea-ink)">
								{user.firstName || "Not set"}
							</dd>
						</div>
						<div>
							<dt className="text-xs font-semibold uppercase text-(--sea-ink-soft)">
								Last name
							</dt>
							<dd className="mt-1 text-sm text-(--sea-ink)">
								{user.lastName || "Not set"}
							</dd>
						</div>
					</dl>
				</div>

				<Link
					to="/favorites"
					className="mt-6 inline-flex rounded-md border border-(--chip-line) px-3 py-2 text-sm font-semibold text-(--sea-ink) no-underline hover:bg-(--chip-bg) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--lagoon)"
				>
					View favorites
				</Link>
			</section>
		</main>
	);
}
