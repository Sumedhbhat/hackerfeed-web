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
    <main className="px-4 pt-8 pb-14 sm:pt-10 page-wrap">
      <section className="pb-8 mb-8 border-b rise-in border-(--line)">
        <p className="mb-4 island-kicker">Collection</p>
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end">
          <h1 className="m-0 text-4xl font-semibold tracking-tight leading-tight sm:text-5xl text-(--sea-ink)">
            Saved stories.
          </h1>

          <div className="flex flex-wrap gap-2 shrink-0">
            <Link
              to="/"
              className="py-1.5 px-4 text-sm font-medium no-underline rounded border transition-colors border-(--chip-line) text-(--sea-ink-soft) hover:text-(--sea-ink) hover:border-(--sea-ink-soft)"
            >
              &larr; Feed
            </Link>
            {count > 0 ? (
              <button
                type="button"
                onClick={clearAllFavorites}
                className="py-1.5 px-4 text-sm font-medium rounded border transition-colors border-(--chip-line) text-(--sea-ink-soft) hover:text-(--sea-ink) hover:border-(--sea-ink-soft)"
              >
                Clear all
              </button>
            ) : null}
          </div>
        </div>

        <p className="m-0 mt-4 text-sm leading-relaxed text-(--sea-ink-soft)">
          {count === 0 ? (
            <>
              Stories you star are saved here and persist across sessions via{" "}
              <code>localStorage</code>. Toggle the star on any story card.
            </>
          ) : (
            <>
              <span className="font-medium text-(--sea-ink)">
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
          <article className="p-6 rounded-lg sm:p-8 island-shell rise-in">
            <p className="mb-3 island-kicker">Nothing saved yet</p>
            <h2 className="m-0 text-2xl font-semibold tracking-tight text-(--sea-ink)">
              Your favorites list is empty.
            </h2>
            <p className="m-0 mt-3 max-w-md text-sm leading-relaxed text-(--sea-ink-soft)">
              Browse the feed and hit the star on any story card to save it
              here.
            </p>
            <div className="mt-5">
              <Link
                to="/"
                className="text-sm font-medium no-underline hover:underline text-(--lagoon-deep) underline-offset-2 hover:text-(--lagoon)"
              >
                Browse the feed &rarr;
              </Link>
            </div>
          </article>
        ) : (
          <>
            {/* Sort controls */}
            <div className="flex flex-wrap gap-3 items-center mb-6 rise-in">
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
                    className={`rounded px-3 py-1 text-xs font-medium transition-colors ${sortOrder === key
                        ? "bg-(--chip-bg) text-(--sea-ink) border border-(--chip-line)"
                        : "text-(--sea-ink-soft) hover:text-(--sea-ink)"
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
