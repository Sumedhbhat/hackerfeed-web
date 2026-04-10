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
		return (b.score ?? 0) - (a.score ?? 0);
	});

	const count = favorites.length;

	return (
		<main className="page-wrap px-4 pb-14 pt-8 sm:pt-10">
			{/* Page header */}
			<section className="rise-in border-b border-[var(--line)] pb-8 mb-8">
				<p className="island-kicker mb-4">Collection</p>
				<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<h1 className="m-0 text-4xl font-semibold leading-tight tracking-tight text-[var(--sea-ink)] sm:text-5xl">
						Saved stories.
					</h1>

					<div className="flex flex-shrink-0 flex-wrap gap-2">
						<Link
							to="/"
							className="border border-[var(--chip-line)] rounded px-4 py-1.5 text-sm font-medium text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)] hover:border-[var(--sea-ink-soft)] no-underline transition-colors"
						>
							&larr; Feed
						</Link>
						{count > 0 ? (
							<button
								type="button"
								onClick={clearAllFavorites}
								className="border border-[var(--chip-line)] rounded px-4 py-1.5 text-sm font-medium text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)] hover:border-[var(--sea-ink-soft)] transition-colors"
							>
								Clear all
							</button>
						) : null}
					</div>
				</div>

				<p className="m-0 mt-4 text-sm leading-relaxed text-[var(--sea-ink-soft)]">
					{count === 0 ? (
						<>
							Stories you star are saved here and persist across sessions via{" "}
							<code>localStorage</code>. Toggle the star on any story card.
						</>
					) : (
						<>
							<span className="font-medium text-[var(--sea-ink)]">
								{count} {count === 1 ? "story" : "stories"}
							</span>{" "}
							saved across sessions.
						</>
					)}
				</p>
			</section>

			{/* Story list */}
			<section>
				{count === 0 ? (
					<article className="island-shell rise-in rounded-lg p-6 sm:p-8">
						<p className="island-kicker mb-3">Nothing saved yet</p>
						<h2 className="m-0 text-2xl font-semibold tracking-tight text-[var(--sea-ink)]">
							Your favorites list is empty.
						</h2>
						<p className="m-0 mt-3 max-w-md text-sm leading-relaxed text-[var(--sea-ink-soft)]">
							Browse the feed and hit the star on any story card to save it here.
						</p>
						<div className="mt-5">
							<Link
								to="/"
								className="text-sm font-medium text-[var(--lagoon-deep)] hover:text-[var(--lagoon)] hover:underline underline-offset-2 no-underline"
							>
								Browse the feed &rarr;
							</Link>
						</div>
					</article>
				) : (
					<>
						{/* Sort controls */}
						<div className="rise-in mb-6 flex flex-wrap items-center gap-3">
							<span className="island-kicker">Sort by</span>
							<div className="flex gap-1">
								{(
									[
										{ key: "newest", label: "Newest" },
										{ key: "oldest", label: "Oldest" },
										{ key: "score", label: "Top score" },
									] as Array<{ key: SortOrder; label: string }>
								).map(({ key, label }) => (
									<button
										key={key}
										type="button"
										onClick={() => setSortOrder(key)}
										aria-pressed={sortOrder === key}
										className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
											sortOrder === key
												? "bg-[var(--chip-bg)] text-[var(--sea-ink)] border border-[var(--chip-line)]"
												: "text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
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
									animationDelay={i * 50 + 60}
								/>
							))}
						</div>
					</>
				)}
			</section>
		</main>
	);
}
