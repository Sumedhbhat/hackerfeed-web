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

// ---------------------------------------------------------------------------
// Skeleton card
// ---------------------------------------------------------------------------

export function StoryCardSkeleton({ index = 0 }: { index?: number }) {
	return (
		<article className="island-shell rounded-lg p-5 sm:p-6">
			<div className="animate-pulse flex gap-6">
				<div className="w-7 flex-none pt-1">
					<div className="h-3 w-5 rounded-sm bg-[var(--sand)]" />
				</div>
				<div className="flex-1 min-w-0 space-y-3">
					<div className="h-2.5 w-24 rounded-sm bg-[var(--sand)]" />
					<div className="h-5 w-[85%] rounded-sm bg-[var(--sand)] opacity-80" />
					<div className="h-5 w-[60%] rounded-sm bg-[var(--sand)] opacity-60" />
					<div className="h-2.5 w-48 rounded-sm bg-[var(--sand)] opacity-50" />
					<div className="flex gap-3 pt-1">
						<div className="h-3 w-20 rounded-sm bg-[var(--sand)] opacity-60" />
						<div className="h-3 w-24 rounded-sm bg-[var(--sand)] opacity-40" />
						<div className="h-3 w-14 rounded-sm bg-[var(--sand)] opacity-30" />
					</div>
				</div>
			</div>
		</article>
	);
}

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
			className="island-shell rounded-lg p-5 sm:p-6 rise-in group"
			style={animationDelay ? { animationDelay: `${animationDelay}ms` } : undefined}
		>
			<div className="flex gap-5 sm:gap-6">
				{/* Rank */}
				{rank !== undefined ? (
					<div className="w-7 flex-none pt-[3px] text-right">
						<span className="text-xs font-medium tabular-nums text-[var(--sea-ink-soft)] opacity-35 select-none">
							{String(rank).padStart(2, "0")}
						</span>
					</div>
				) : null}

				<div className="min-w-0 flex-1">
					{/* Meta row */}
					<div className="mb-2.5 flex flex-wrap items-center gap-1.5 text-[0.65rem] font-semibold tracking-[0.12em] uppercase text-[var(--kicker)]">
						{domain ? <span>{domain}</span> : null}
						{domain ? <span className="opacity-40">/</span> : null}
						<span className="opacity-70">{age}</span>
					</div>

					{/* Title */}
					<h3
						className="m-0 mb-3 text-lg font-semibold leading-snug text-[var(--sea-ink)] sm:text-xl cursor-pointer"
						onClick={() => openLink(story.url ?? getDiscussionUrl(story.id))}
					>
						{title}
					</h3>

					{/* Summary */}
					{summary ? (
						<p className="m-0 mb-4 text-sm leading-relaxed text-[var(--sea-ink-soft)] line-clamp-2">
							{summary}
						</p>
					) : null}

					{/* Stats */}
					<p className="m-0 mb-4 text-xs text-[var(--sea-ink-soft)] opacity-70">
						{story.score} pts
						{story.by ? <> &middot; {story.by}</> : null}
						{story.descendants != null ? <> &middot; {story.descendants} comments</> : null}
					</p>

					{/* Actions */}
					<div className="flex flex-wrap items-center gap-4">
						<button
							type="button"
							onClick={() => openLink(story.url ?? getDiscussionUrl(story.id))}
							className="text-sm font-medium text-[var(--lagoon-deep)] hover:text-[var(--lagoon)] underline-offset-2 hover:underline"
						>
							{story.url ? "Read article" : "Open post"}{" "}
							<span aria-hidden="true" className="opacity-60">&rarr;</span>
						</button>

						<button
							type="button"
							onClick={() => openLink(getDiscussionUrl(story.id))}
							className="text-sm text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
						>
							Discussion
						</button>

						<button
							type="button"
							aria-label={isFav ? "Remove from favorites" : "Save to favorites"}
							aria-pressed={isFav}
							onClick={() => toggleFavorite(story)}
							className={`text-sm transition-colors ${
								isFav
									? "font-medium text-[var(--kicker)]"
									: "text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
							}`}
						>
							{isFav ? (
								<>
									<span key="star-filled" aria-hidden="true" className="star-pop">
										★
									</span>
									{" "}Saved
								</>
							) : (
								<>
									<span key="star-empty" aria-hidden="true">☆</span>
									{" "}Save
								</>
							)}
						</button>
					</div>
				</div>
			</div>
		</article>
	);
}
