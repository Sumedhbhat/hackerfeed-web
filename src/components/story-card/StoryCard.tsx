import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { useFavorites } from "#/hooks/useFavorites";
import type { HackerNewsStoryRecord } from "#/lib/hacker-news/queries";
import {
	formatStoryAge,
	getDiscussionUrl,
	getStoryDomain,
	getStoryTitle,
} from "#/lib/hacker-news/utils";
import { openLink } from "#/lib/open-link";

// ---------------------------------------------------------------------------
// Story card
// ---------------------------------------------------------------------------

type StoryCardProps = {
	story: HackerNewsStoryRecord;
	animationDelay?: number;
};

export function StoryCard({ story, animationDelay }: StoryCardProps) {
	const { isFavorited, toggleFavorite } = useFavorites();
	const isFav = isFavorited(story.id);

	const domain = getStoryDomain(story.url);
	const age = formatStoryAge(story.time);
	const title = getStoryTitle(story);

	return (
		<article
			className="p-4 rounded-lg sm:p-6 island-shell rise-in group"
			style={
				animationDelay ? { animationDelay: `${animationDelay}ms` } : undefined
			}
		>
			<div className="flex gap-5 sm:gap-6">
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
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ")
								openLink(story.url ?? getDiscussionUrl(story.id));
						}}
					>
						{title}
					</h3>

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
							{story.url ? "Read article" : "Open post"}
						</button>

						<Link
							to="/story/$storyId"
							params={{ storyId: story.id }}
							className="text-sm text-(--sea-ink-soft) hover:text-(--sea-ink-soft)"
						>
							Discussion
						</Link>

						<button
							type="button"
							aria-label={isFav ? "Remove from favorites" : "Save to favorites"}
							aria-pressed={isFav}
							onClick={() => toggleFavorite(story)}
							className={`text-sm transition-colors ${
								isFav
									? "font-medium text-(--kicker)"
									: "text-(--sea-ink-soft) hover:text-(--sea-ink)"
							}`}
						>
							{isFav ? (
								<>
									<Star
										key="star-filled"
										size={14}
										fill="currentColor"
										aria-hidden="true"
										className="inline star-pop"
									/>{" "}
									Saved
								</>
							) : (
								<>
									<Star
										key="star-empty"
										size={14}
										aria-hidden="true"
										className="inline"
									/>{" "}
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
