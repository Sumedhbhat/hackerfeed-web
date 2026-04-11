import { useStore } from "@tanstack/react-store";
import { favoritesStore, toggleFavorite } from "#/lib/favorites-store";
import type { HackerNewsStoryRecord } from "#/lib/hacker-news/queries";
import {
  formatStoryAge,
  getDiscussionUrl,
  getStoryDomain,
  getStorySummary,
  getStoryTitle,
} from "#/lib/hacker-news/utils";
import { openLink } from "#/lib/open-link";

export { StoryCardSkeleton } from "./StoryCardSkeleton";

// ---------------------------------------------------------------------------
// Story card
// ---------------------------------------------------------------------------

type StoryCardProps = {
  story: HackerNewsStoryRecord;
  rank?: number;
  animationDelay?: number;
};

export function StoryCard({ story, rank, animationDelay }: StoryCardProps) {
  const isFav = useStore(favoritesStore, (state) => state.items.has(story.id));

  const domain = getStoryDomain(story.url);
  const age = formatStoryAge(story.time);
  const title = getStoryTitle(story);
  const summary = getStorySummary(story);

  return (
    <article
      className="p-5 rounded-lg sm:p-6 island-shell rise-in group"
      style={
        animationDelay ? { animationDelay: `${animationDelay}ms` } : undefined
      }
    >
      <div className="flex gap-5 sm:gap-6">
        {/* Rank */}
        {rank !== undefined ? (
          <div className="hidden flex-none w-7 text-right sm:block pt-0.75">
            <span className="text-xs font-medium tabular-nums select-none text-(--sea-ink-soft) opacity-35">
              {String(rank).padStart(2, "0")}
            </span>
          </div>
        ) : null}

        <div className="flex-1 min-w-0">
          {/* Meta row */}
          <div className="flex flex-wrap gap-1.5 items-center mb-2.5 font-semibold uppercase text-[0.65rem] tracking-[0.12em] text-(--kicker)">
            {domain ? <span>{domain}</span> : null}
            {domain ? <span className="opacity-40">/</span> : null}
            <span className="opacity-70">{age}</span>
          </div>

          {/* Title */}
          <h3
            className="m-0 mb-3 text-lg font-semibold leading-snug cursor-pointer sm:text-xl text-(--sea-ink)"
            onClick={() => openLink(story.url ?? getDiscussionUrl(story.id))}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openLink(story.url ?? getDiscussionUrl(story.id)) }}
          >
            {title}
          </h3>

          {/* Summary */}
          {summary ? (
            <p className="m-0 mb-4 text-sm leading-relaxed text-(--sea-ink-soft) line-clamp-2">
              {summary}
            </p>
          ) : null}

          {/* Stats */}
          <p className="m-0 mb-4 text-xs opacity-70 text-(--sea-ink-soft)">
            {story.score} pts
            {story.by ? <> &middot; {story.by}</> : null}
            {story.descendants != null ? (
              <> &middot; {story.descendants} comments</>
            ) : null}
          </p>

          {/* Actions */}
          <div className="flex flex-wrap gap-4 items-center">
            <button
              type="button"
              onClick={() => openLink(story.url ?? getDiscussionUrl(story.id))}
              className="text-sm font-medium hover:underline text-(--lagoon-deep) underline-offset-2 hover:text-(--lagoon)"
            >
              {story.url ? "Read article" : "Open post"}{" "}
              <span aria-hidden="true" className="opacity-60">
                &rarr;
              </span>
            </button>

            <button
              type="button"
              onClick={() => openLink(getDiscussionUrl(story.id))}
              className="text-sm text-(--sea-ink-soft) hover:text-(--sea-ink)"
            >
              Discussion
            </button>

            <button
              type="button"
              aria-label={isFav ? "Remove from favorites" : "Save to favorites"}
              aria-pressed={isFav}
              onClick={() => toggleFavorite(story)}
              className={`text-sm transition-colors ${isFav
                  ? "font-medium text-(--kicker)"
                  : "text-(--sea-ink-soft) hover:text-(--sea-ink)"
                }`}
            >
              {isFav ? (
                <>
                  <span
                    key="star-filled"
                    aria-hidden="true"
                    className="star-pop"
                  >
                    ★
                  </span>{" "}
                  Saved
                </>
              ) : (
                <>
                  <span key="star-empty" aria-hidden="true">
                    ☆
                  </span>{" "}
                  Save
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
