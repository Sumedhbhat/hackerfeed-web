import { Link } from "@tanstack/react-router";
import { ArrowRight, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { PaperRow } from "#/components/papers/PapersPage";
import { StoryCard } from "#/components/story-card";
import { useAuthSession } from "#/hooks/useAuthSession";
import { useFavorites } from "#/hooks/useFavorites";
import { usePaperFavorites } from "#/hooks/usePaperFavorites";
import { useViewActivity } from "#/hooks/useViewActivity";
import type { FavoritesType } from "#/routes/favorites";

type SortOrder = "newest" | "oldest" | "score";

type FavoritesPageProps = {
	activeType?: FavoritesType;
	onTypeChange?: (type: FavoritesType) => void;
};

export function FavoritesPage({
	activeType = "stories",
	onTypeChange = () => undefined,
}: FavoritesPageProps) {
	const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
	const { user } = useAuthSession();
	const stories = useFavorites();
	const papers = usePaperFavorites();
	const { recordPaperView } = useViewActivity();
	const isStories = activeType === "stories";
	const activeCount = isStories ? stories.count : papers.count;
	const sortedStories = useMemo(() => {
		const all = stories.getFavorites();
		return [...all].sort((a, b) => {
			if (sortOrder === "newest") return 0;
			if (sortOrder === "oldest") return all.indexOf(b) - all.indexOf(a);
			return (b.score ?? 0) - (a.score ?? 0);
		});
	}, [sortOrder, stories]);
	const sortedPapers = useMemo(() => {
		const all = [...papers.savedPapers];
		if (sortOrder === "oldest") return all.reverse();
		if (sortOrder === "score") return all.sort((a, b) => b.upvotes - a.upvotes);
		return all;
	}, [papers.savedPapers, sortOrder]);

	function confirmClear() {
		const label = isStories ? "saved stories" : "saved papers";
		if (!window.confirm(`Clear all ${label}? This cannot be undone.`)) return;
		if (isStories) stories.clearAllFavorites();
		else papers.clearAll();
	}

	function handleTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
		if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
		event.preventDefault();
		const focusedType = event.currentTarget.id.includes("papers")
			? "papers"
			: "stories";
		const nextType =
			event.key === "Home"
				? "stories"
				: event.key === "End"
					? "papers"
					: focusedType === "stories"
						? "papers"
						: "stories";
		onTypeChange(nextType);
		document.getElementById(`favorites-${nextType}-tab`)?.focus();
	}

	return (
		<main className="px-4 pt-6 pb-14 page-wrap">
			<div className="favorites-tabs" role="tablist" aria-label="Favorite type">
				{(["stories", "papers"] as const).map((type) => (
					<button
						key={type}
						type="button"
						role="tab"
						aria-selected={activeType === type}
						aria-controls={`favorites-${type}-panel`}
						id={`favorites-${type}-tab`}
						tabIndex={activeType === type ? 0 : -1}
						onClick={() => onTypeChange(type)}
						onKeyDown={handleTabKeyDown}
					>
						{type === "stories" ? "Stories" : "Papers"}
					</button>
				))}
			</div>

			<section
				role="tabpanel"
				id={`favorites-${activeType}-panel`}
				aria-labelledby={`favorites-${activeType}-tab`}
			>
				{!isStories && !user ? (
					<EmptyState
						kicker="Sign in required"
						title="Sign in to view saved papers."
						copy="Paper favorites are tied to your account and stay available across sessions."
						to="/auth/sign-in"
						linkLabel="Sign in"
					/>
				) : !isStories && papers.isLoading ? (
					<output className="text-sm text-(--sea-ink-soft)">
						Loading saved papers...
					</output>
				) : !isStories && papers.error && activeCount === 0 ? (
					<PaperFavoritesError onRefresh={papers.refresh} />
				) : activeCount === 0 ? (
					<EmptyState
						kicker="Nothing saved yet"
						title={`Your saved ${isStories ? "stories" : "papers"} list is empty.`}
						copy={`Browse ${isStories ? "the feed" : "papers"} and use the star to save items here.`}
						to={isStories ? "/" : "/papers"}
						linkLabel={`Browse ${isStories ? "the feed" : "papers"}`}
					/>
				) : (
					<>
						<div className="flex flex-wrap gap-3 justify-between items-center mb-6 rise-in">
							<div className="flex gap-3 items-center">
								<span className="island-kicker">Sort by</span>
								<div className="flex gap-1">
									{(
										[
											["newest", "Newest"],
											["oldest", "Oldest"],
											["score", isStories ? "Top score" : "Upvotes"],
										] as const
									).map(([key, label]) => (
										<button
											key={key}
											type="button"
											onClick={() => setSortOrder(key)}
											aria-pressed={sortOrder === key}
											className={`rounded px-3 py-1 text-xs font-medium transition-colors ${sortOrder === key ? "bg-(--chip-bg) text-(--sea-ink) border border-(--chip-line)" : "text-(--sea-ink-soft) hover:text-(--sea-ink)"}`}
										>
											{label}
										</button>
									))}
								</div>
							</div>
							<button
								type="button"
								onClick={confirmClear}
								disabled={!isStories && !papers.canClear}
								className="py-1.5 px-4 text-sm font-medium rounded border transition-colors border-(--chip-line) text-(--sea-ink-soft) hover:text-(--sea-ink) hover:border-(--sea-ink-soft) disabled:cursor-wait disabled:opacity-55"
							>
								{!isStories && papers.isClearPending
									? "Clearing..."
									: `Clear ${isStories ? "stories" : "papers"}`}
							</button>
						</div>
						{papers.error && !isStories ? (
							<output className="papers-favorites-error">
								<span>{papers.error}</span>
								<button
									type="button"
									onClick={papers.refresh}
									aria-label="Refresh saved favorites"
									title="Refresh saved favorites"
								>
									<RefreshCw size={14} aria-hidden="true" />
								</button>
							</output>
						) : null}
						<section
							className={isStories ? "space-y-3" : "papers-list"}
							aria-label={isStories ? "Saved stories" : "Saved papers"}
						>
							{isStories
								? sortedStories.map((story, index) => (
										<StoryCard
											key={story.id}
											story={story}
											animationDelay={index * 50 + 60}
										/>
									))
								: sortedPapers.map((paper, index) => (
										<PaperRow
											key={paper.arxivId}
											paper={paper}
											index={index}
											canFavorite={papers.canFavorite}
											isFavorited={papers.isFavorited(paper.arxivId)}
											isPending={
												papers.isPending(paper.arxivId) || papers.isClearPending
											}
											onToggleFavorite={() => papers.toggleFavorite(paper)}
											onView={() => recordPaperView(paper.arxivId)}
										/>
									))}
						</section>
					</>
				)}
			</section>
		</main>
	);
}

function PaperFavoritesError({ onRefresh }: { onRefresh: () => void }) {
	return (
		<div className="papers-favorites-error" role="alert">
			<span>Could not load saved favorites.</span>
			<button type="button" onClick={onRefresh}>
				<RefreshCw size={14} aria-hidden="true" /> Refresh saved favorites
			</button>
		</div>
	);
}

function EmptyState({
	kicker,
	title,
	copy,
	to,
	linkLabel,
}: {
	kicker: string;
	title: string;
	copy: string;
	to: string;
	linkLabel: string;
}) {
	return (
		<article className="p-6 rounded-lg sm:p-8 island-shell rise-in">
			<p className="mb-3 island-kicker">{kicker}</p>
			<h2 className="m-0 text-2xl font-semibold tracking-tight text-(--sea-ink)">
				{title}
			</h2>
			<p className="m-0 mt-3 max-w-md text-sm leading-relaxed text-(--sea-ink-soft)">
				{copy}
			</p>
			<div className="mt-5">
				<Link
					to={to}
					className="text-sm font-medium no-underline hover:underline text-(--lagoon-deep) underline-offset-2 hover:text-(--lagoon)"
				>
					{linkLabel} <ArrowRight size={14} aria-hidden="true" />
				</Link>
			</div>
		</article>
	);
}
