import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useState } from "react";
import { StoryCard } from "#/components/StoryCard";
import { clearAllFavorites, favoritesStore } from "#/lib/favorites-store";

export const Route = createFileRoute("/favorites")({
	component: FavoritesPage,
});

type SortOrder = "newest" | "oldest" | "score";

function FavoritesPage() {
	const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

	const allFavorites = useStore(favoritesStore, (state) =>
		Array.from(state.items.values()),
	);

	const favorites = [...allFavorites].sort((a, b) => {
		if (sortOrder === "newest") return (b.time ?? 0) - (a.time ?? 0);
		if (sortOrder === "oldest") return (a.time ?? 0) - (b.time ?? 0);
		// score
		return (b.score ?? 0) - (a.score ?? 0);
	});

	const count = favorites.length;

	return (
		<main className="page-wrap px-4 pb-10 pt-8 sm:pb-14 sm:pt-10">
			{/* Hero section */}
			<section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
				<div className="pointer-events-none absolute -left-12 top-0 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_68%)]" />
				<div className="pointer-events-none absolute right-0 top-0 h-28 w-28 bg-[linear-gradient(135deg,rgba(47,106,74,0.22),transparent)]" />

				<div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<p className="island-kicker mb-3">Your collection</p>
						<h1 className="display-title m-0 text-4xl leading-[0.98] font-bold tracking-tight text-[var(--sea-ink)] sm:text-5xl">
							Saved stories.
						</h1>
						<p className="mb-0 mt-4 max-w-2xl text-sm leading-6 text-[var(--sea-ink-soft)]">
							{count === 0 ? (
								<>
									Stories you star are saved here and persist across sessions
									using <code>localStorage</code>. Toggle the star on any story
									card to add or remove it.
								</>
							) : (
								<>
									<span className="font-semibold text-[var(--sea-ink)]">
										{count} {count === 1 ? "story" : "stories"}
									</span>{" "}
									saved. Toggle the star on any card to add or remove it.
									Persists across sessions via <code>localStorage</code>.
								</>
							)}
						</p>
					</div>

					<div className="flex flex-shrink-0 flex-wrap gap-2">
						<Link
							to="/"
							className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-4 py-2 text-sm font-semibold text-[var(--sea-ink)] no-underline hover:-translate-y-0.5"
						>
							&larr; Back to feed
						</Link>
						{count > 0 ? (
							<button
								type="button"
								onClick={clearAllFavorites}
								className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-4 py-2 text-sm font-semibold text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)] hover:-translate-y-0.5"
							>
								Clear all
							</button>
						) : null}
					</div>
				</div>
			</section>

			{/* Story list */}
			<section className="mt-6">
				{count === 0 ? (
					<article className="island-shell rise-in rounded-[1.75rem] p-5 sm:p-8">
						<p className="island-kicker mb-2">Nothing saved yet</p>
						<h2 className="m-0 text-xl font-semibold tracking-tight text-[var(--sea-ink)]">
							Your favorites list is empty.
						</h2>
						<p className="m-0 mt-3 max-w-xl text-sm leading-6 text-[var(--sea-ink-soft)]">
							Browse the feed and hit the star button on any story card to save
							it here. Your collection persists across browser sessions.
						</p>
						<div className="mt-5">
							<Link
								to="/"
								className="rounded-full border border-[rgba(50,143,151,0.35)] bg-[rgba(79,184,178,0.14)] px-4 py-2 text-sm font-semibold text-[var(--lagoon-deep)] no-underline hover:-translate-y-0.5 hover:bg-[rgba(79,184,178,0.24)]"
							>
								Browse the feed
							</Link>
						</div>
					</article>
				) : (
					<>
						{/* Sort controls */}
						<div className="island-shell rise-in mb-4 flex flex-wrap items-center gap-3 rounded-[1.5rem] px-4 py-3 sm:px-5">
							<span className="island-kicker">Sort</span>
							<div className="flex flex-wrap gap-2">
								{(
									[
										{ key: "newest", label: "Newest first" },
										{ key: "oldest", label: "Oldest first" },
										{ key: "score", label: "Top score" },
									] as Array<{ key: SortOrder; label: string }>
								).map(({ key, label }) => (
									<button
										key={key}
										type="button"
										onClick={() => setSortOrder(key)}
										aria-pressed={sortOrder === key}
										className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
											sortOrder === key
												? "border-[rgba(50,143,151,0.4)] bg-[rgba(79,184,178,0.16)] text-[var(--sea-ink)]"
												: "border-[var(--chip-line)] bg-[var(--chip-bg)] text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
										}`}
									>
										{label}
									</button>
								))}
							</div>
						</div>

						<div className="space-y-3">
							{favorites.map((story, i) => (
								<StoryCard
									key={story.id}
									story={story}
									animationDelay={i * 60 + 80}
								/>
							))}
						</div>
					</>
				)}
			</section>
		</main>
	);
}
