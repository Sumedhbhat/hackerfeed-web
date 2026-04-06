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

// ---------------------------------------------------------------------------
// Skeleton card — exported so both the feed page and favorites can use it
// ---------------------------------------------------------------------------

export function StoryCardSkeleton({ index = 0 }: { index?: number }) {
	return (
		<article
			className="island-shell rise-in rounded-[1.6rem] p-4 sm:p-5"
			style={{ animationDelay: `${index * 70 + 100}ms` }}
		>
			<div className="animate-pulse space-y-4">
				<div className="flex items-start gap-3 sm:gap-4">
					<div className="h-11 w-11 rounded-2xl bg-[rgba(79,184,178,0.16)]" />
					<div className="min-w-0 flex-1">
						<div className="h-3 w-28 rounded-full bg-[rgba(79,184,178,0.16)]" />
						<div className="mt-3 h-4 w-[88%] rounded-full bg-[rgba(23,58,64,0.12)]" />
						<div className="mt-2 h-4 w-[74%] rounded-full bg-[rgba(23,58,64,0.08)]" />
						<div className="mt-4 flex gap-2">
							<div className="h-8 w-24 rounded-full bg-[rgba(79,184,178,0.14)]" />
							<div className="h-8 w-28 rounded-full bg-[rgba(23,58,64,0.08)]" />
						</div>
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
	/** 1-based display rank shown in the position badge. */
	rank?: number;
	animationDelay?: number;
};

export function StoryCard({ story, rank, animationDelay = 0 }: StoryCardProps) {
	// Subscribe to just the presence of this story's id so the button
	// re-renders only when this specific story is toggled.
	const isFav = useStore(favoritesStore, (state) => state.items.has(story.id));

	return (
		<article
			className="island-shell rise-in rounded-[1.6rem] p-4 sm:p-5"
			style={{ animationDelay: `${animationDelay}ms` }}
		>
			<div className="flex items-start gap-3 sm:gap-4">
				{/* Position badge — only shown when a rank is provided */}
				{rank !== undefined ? (
					<div className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl border border-[var(--chip-line)] bg-[var(--chip-bg)] text-sm font-bold tracking-[0.16em] text-[var(--kicker)]">
						{String(rank).padStart(2, "0")}
					</div>
				) : null}

				<div className="min-w-0 flex-1">
					{/* Meta row */}
					<div className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-[0.12em] text-[var(--kicker)] uppercase">
						<span>{getStoryDomain(story.url)}</span>
						<span className="text-[var(--sea-ink-soft)]">/</span>
						<span>{formatStoryAge(story.time)}</span>
					</div>

					{/* Title */}
					<h3 className="m-0 mt-2 text-lg leading-tight font-semibold text-[var(--sea-ink)] sm:text-xl">
						{getStoryTitle(story)}
					</h3>

					{/* Summary */}
					<p className="m-0 mt-3 text-sm leading-6 text-[var(--sea-ink-soft)]">
						{getStorySummary(story)}
					</p>

					{/* Stat chips */}
					<div className="mt-4 flex flex-wrap gap-2 text-sm text-[var(--sea-ink-soft)]">
						<span className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5">
							{story.score} points
						</span>
						<span className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5">
							by {story.by ?? "unknown"}
						</span>
						<span className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5">
							{story.descendants} comments
						</span>
					</div>

					{/* Actions */}
					<div className="mt-4 flex flex-wrap gap-2">
						<a
							href={story.url ?? getDiscussionUrl(story.id)}
							target="_blank"
							rel="noreferrer"
							className="rounded-full border border-[rgba(50,143,151,0.35)] bg-[rgba(79,184,178,0.14)] px-4 py-2 text-sm font-semibold text-[var(--lagoon-deep)] no-underline hover:-translate-y-0.5 hover:bg-[rgba(79,184,178,0.24)]"
						>
							{story.url ? "Read article" : "Open post"}
						</a>
						<a
							href={getDiscussionUrl(story.id)}
							target="_blank"
							rel="noreferrer"
							className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-4 py-2 text-sm font-semibold text-[var(--sea-ink)] no-underline hover:-translate-y-0.5"
						>
							Open discussion
						</a>

						{/* Favorite toggle */}
						<button
							type="button"
							aria-label={isFav ? "Remove from favorites" : "Save to favorites"}
							aria-pressed={isFav}
							onClick={() => toggleFavorite(story)}
							className={`rounded-full border px-3 py-2 text-sm font-semibold transition-colors ${
								isFav
									? "border-[rgba(50,143,151,0.5)] bg-[rgba(79,184,178,0.22)] text-[var(--lagoon-deep)]"
									: "border-[var(--chip-line)] bg-[var(--chip-bg)] text-[var(--sea-ink-soft)] hover:border-[rgba(50,143,151,0.35)] hover:text-[var(--lagoon-deep)]"
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
									</span>
									<span className="ml-1.5">Saved</span>
								</>
							) : (
								<>
									<span
										key="star-empty"
										aria-hidden="true"
										className="star-pop"
									>
										☆
									</span>
									<span className="ml-1.5">Save</span>
								</>
							)}
						</button>
					</div>
				</div>
			</div>
		</article>
	);
}
