import { useQueries, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useState } from "react";
import { StoryCard, StoryCardSkeleton } from "#/components/StoryCard";
import { favoritesStore } from "#/lib/favorites-store";
import {
	feedStoryIdsQueryOptions,
	type HackerNewsFeedKey,
	PAGE_SIZE,
	storyItemQueryOptions,
} from "#/lib/hacker-news/queries";

export const Route = createFileRoute("/")({
	component: App,
	loader: async ({ context }) => {
		// Prefetch the ID list, then warm the cache for each initial item in parallel.
		const ids = await context.queryClient.ensureQueryData(
			feedStoryIdsQueryOptions("top"),
		);
		await Promise.all(
			ids
				.slice(0, PAGE_SIZE)
				.map((id) =>
					context.queryClient.ensureQueryData(storyItemQueryOptions(id)),
				),
		);
	},
});

const feedTabs: Array<{
	key: HackerNewsFeedKey;
	label: string;
	strap: string;
	title: string;
	description: string;
}> = [
	{
		key: "top",
		label: "Top",
		strap: "What everyone is reading",
		title: "Top stories",
		description:
			"Live Hacker News leaders with lightweight caching and quick retry.",
	},
	{
		key: "new",
		label: "New",
		strap: "Fresh links rolling in",
		title: "New stories",
		description:
			"Newest submissions, fetched on demand without a second screen.",
	},
	{
		key: "best",
		label: "Best",
		strap: "Long-tail standouts",
		title: "Best stories",
		description:
			"High-signal Hacker News stories with the same mobile-first shell.",
	},
];

function App() {
	const [activeFeed, setActiveFeed] = useState<HackerNewsFeedKey>("top");
	// Track how many items are loaded per feed independently so switching tabs
	// does not reset the loaded count on the previous tab.
	const [loadedCounts, setLoadedCounts] = useState<
		Record<HackerNewsFeedKey, number>
	>({ top: PAGE_SIZE, new: PAGE_SIZE, best: PAGE_SIZE });

	const activeFeedMeta =
		feedTabs.find((feed) => feed.key === activeFeed) ?? feedTabs[0];
	const loadedCount = loadedCounts[activeFeed];

	// Layer 1: fetch and cache the full ID list for the active feed.
	const idsQuery = useQuery(feedStoryIdsQueryOptions(activeFeed));
	const allIds = idsQuery.data ?? [];
	const displayedIds = allIds.slice(0, loadedCount);
	const hasMore = allIds.length > loadedCount;
	const nextBatchSize = Math.min(allIds.length - loadedCount, PAGE_SIZE);

	// Layer 2: fetch each displayed item individually.
	// Items already in the TanStack Query cache (e.g. from the loader or a
	// previous tab visit) are served instantly; new items load progressively.
	const itemQueries = useQueries({
		queries: displayedIds.map((id) => storyItemQueryOptions(id)),
	});

	const isAnyItemLoading = itemQueries.some((q) => q.isPending);

	// Status is driven by the ID-list query; item-level loading is handled
	// inline per card so content can appear progressively.
	const activeStatus = idsQuery.isPending
		? "loading"
		: idsQuery.isError
			? "error"
			: allIds.length === 0
				? "empty"
				: "ready";

	const loadMore = () => {
		setLoadedCounts((prev) => ({
			...prev,
			[activeFeed]: prev[activeFeed] + PAGE_SIZE,
		}));
	};

	return (
		<main className="page-wrap px-4 pb-10 pt-8 sm:pb-14 sm:pt-10">
			<section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
				<div className="pointer-events-none absolute -left-12 top-0 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_68%)]" />
				<div className="pointer-events-none absolute right-0 top-0 h-28 w-28 bg-[linear-gradient(135deg,rgba(47,106,74,0.22),transparent)]" />

				<div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.9fr)] lg:items-end">
					<div>
						<p className="island-kicker mb-3">Portable reading shell</p>
						<h1 className="display-title m-0 max-w-3xl text-4xl leading-[0.98] font-bold tracking-tight text-[var(--sea-ink)] sm:text-5xl lg:text-6xl">
							Scan Hacker News in one thumb.
						</h1>
						<p className="mb-0 mt-4 max-w-2xl text-sm leading-6 text-[var(--sea-ink-soft)] sm:text-base">
							HackerFeed now opens as a live app screen instead of a starter
							landing page, with TanStack Query-backed feeds, touch-sized story
							cards, and shared loading, error, and empty states.
						</p>
					</div>

					<div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
						{[
							["3 feeds", "Top, new, and best stay within thumb reach."],
							[
								"2 actions",
								"Jump to the article or the HN thread from every story.",
							],
							[
								"1 shell",
								"Loading, error, and empty surfaces share the same frame.",
							],
						].map(([title, copy], index) => (
							<article
								key={title}
								className="feature-card rounded-2xl border border-[var(--line)] px-4 py-4"
								style={{ animationDelay: `${index * 90 + 80}ms` }}
							>
								<p className="m-0 text-sm font-semibold text-[var(--sea-ink)]">
									{title}
								</p>
								<p className="m-0 mt-2 text-sm leading-6 text-[var(--sea-ink-soft)]">
									{copy}
								</p>
							</article>
						))}
					</div>
				</div>
			</section>

			<section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_21rem]">
				<div className="space-y-4">
					<div className="island-shell rise-in rounded-[1.75rem] p-3 sm:p-4">
						<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
							<div>
								<p className="island-kicker mb-2">Feeds</p>
								<h2 className="m-0 text-xl font-semibold tracking-tight text-[var(--sea-ink)]">
									{activeFeedMeta.title}
								</h2>
								<p className="m-0 mt-2 max-w-2xl text-sm leading-6 text-[var(--sea-ink-soft)]">
									{activeFeedMeta.description}
								</p>
							</div>

							<div className="flex flex-wrap gap-2">
								{feedTabs.map((feed) => {
									const isActive = activeFeed === feed.key;

									return (
										<button
											key={feed.key}
											type="button"
											onClick={() => setActiveFeed(feed.key)}
											aria-pressed={isActive}
											className={`rounded-full border px-4 py-2 text-left text-sm font-semibold ${
												isActive
													? "border-[rgba(50,143,151,0.4)] bg-[rgba(79,184,178,0.16)] text-[var(--sea-ink)] shadow-[0_8px_24px_rgba(30,90,72,0.08)]"
													: "border-[var(--chip-line)] bg-[var(--chip-bg)] text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
											}`}
										>
											{feed.label}
										</button>
									);
								})}
							</div>
						</div>

						<div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold tracking-[0.12em] text-[var(--kicker)] uppercase">
							<span>{activeFeedMeta.strap}</span>
							<span className="text-[var(--sea-ink-soft)]">/</span>
							<span>
								{activeStatus === "ready"
									? idsQuery.isFetching
										? "Refreshing feed"
										: isAnyItemLoading
											? "Loading stories"
											: "Live feed"
									: activeStatus === "loading"
										? "Loading surface"
										: activeStatus === "empty"
											? "Empty surface"
											: "Recovery surface"}
							</span>
						</div>
					</div>

					{/* ID list is still loading — show full-page skeleton */}
					{activeStatus === "loading" ? (
						<div className="space-y-3">
							{Array.from({ length: PAGE_SIZE }, (_, i) => (
								<StoryCardSkeleton key={`skeleton-${i}`} index={i} />
							))}
						</div>
					) : null}

					{/* IDs are available — render stories progressively */}
					{activeStatus === "ready" ? (
						<>
							<div className="space-y-3">
								{displayedIds.map((storyId, positionIndex) => {
									const query = itemQueries[positionIndex];

									// Item is still fetching — show inline skeleton so already-loaded
									// items above remain visible while new ones stream in.
									if (!query || query.isPending) {
										return (
											<StoryCardSkeleton key={storyId} index={positionIndex} />
										);
									}

									// Dead, deleted, or non-story items resolve to null — skip them.
									const story = query.data;
									if (!story) return null;

									return (
										<StoryCard
											key={storyId}
											story={story}
											rank={positionIndex + 1}
											animationDelay={positionIndex * 80 + 120}
										/>
									);
								})}
							</div>

							{/* Load more — only shown when more IDs exist beyond the current window */}
							{hasMore ? (
								<div className="flex justify-center pt-2">
									<button
										type="button"
										onClick={loadMore}
										disabled={isAnyItemLoading}
										className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-6 py-2.5 text-sm font-semibold text-[var(--sea-ink-soft)] transition-colors hover:text-[var(--sea-ink)] disabled:cursor-not-allowed disabled:opacity-50"
									>
										{isAnyItemLoading
											? "Loading\u2026"
											: `Load ${nextBatchSize} more`}
									</button>
								</div>
							) : null}
						</>
					) : null}

					{activeStatus === "empty" ? (
						<article className="island-shell rise-in rounded-[1.75rem] p-5 sm:p-6">
							<p className="island-kicker mb-2">Nothing here yet</p>
							<h3 className="m-0 text-xl font-semibold tracking-tight text-[var(--sea-ink)]">
								No {activeFeedMeta.label.toLowerCase()} stories came back.
							</h3>
							<p className="m-0 mt-3 max-w-xl text-sm leading-6 text-[var(--sea-ink-soft)]">
								The feed query completed, but there were no story records to
								show. A quick refresh should pick up new items as they land.
							</p>
							<div className="mt-5 flex flex-wrap gap-2">
								<button
									type="button"
									onClick={() => idsQuery.refetch()}
									className="rounded-full border border-[rgba(50,143,151,0.35)] bg-[rgba(79,184,178,0.14)] px-4 py-2 text-sm font-semibold text-[var(--lagoon-deep)]"
								>
									Refresh feed
								</button>
							</div>
						</article>
					) : null}

					{activeStatus === "error" ? (
						<article className="island-shell rise-in rounded-[1.75rem] p-5 sm:p-6">
							<p className="island-kicker mb-2">Feed unavailable</p>
							<h3 className="m-0 text-xl font-semibold tracking-tight text-[var(--sea-ink)]">
								Couldn't refresh {activeFeedMeta.title.toLowerCase()}.
							</h3>
							<p className="m-0 mt-3 max-w-xl text-sm leading-6 text-[var(--sea-ink-soft)]">
								The live Hacker News request failed, but the recovery panel is
								now wired to the real feed query so retry behavior can grow from
								here.
							</p>
							<div className="mt-5 flex flex-wrap gap-2">
								<button
									type="button"
									onClick={() => idsQuery.refetch()}
									className="rounded-full border border-[rgba(50,143,151,0.35)] bg-[rgba(79,184,178,0.14)] px-4 py-2 text-sm font-semibold text-[var(--lagoon-deep)]"
								>
									Retry feed
								</button>
								<a
									href="https://github.com/HackerNews/API"
									target="_blank"
									rel="noreferrer"
									className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-4 py-2 text-sm font-semibold text-[var(--sea-ink)] no-underline"
								>
									API status notes
								</a>
							</div>
						</article>
					) : null}
				</div>

				<aside className="space-y-4">
					<section
						className="island-shell rise-in rounded-[1.75rem] p-5"
						style={{ animationDelay: "140ms" }}
					>
						<p className="island-kicker mb-2">Reading flow</p>
						<h2 className="m-0 text-xl font-semibold tracking-tight text-[var(--sea-ink)]">
							Built for short sessions.
						</h2>
						<div className="mt-4 space-y-3 text-sm leading-6 text-[var(--sea-ink-soft)]">
							<p className="m-0">
								Sticky navigation keeps the active feed available without
								stealing vertical space.
							</p>
							<p className="m-0">
								Cards use oversized tap targets so article and discussion
								actions stay easy to hit on mobile.
							</p>
							<p className="m-0">
								Hit the star on any story card to save it to your favorites.
								Saves persist across sessions via <code>localStorage</code>.
							</p>
						</div>
					</section>

					<FavoritesSidebar />
				</aside>
			</section>
		</main>
	);
}

// ---------------------------------------------------------------------------
// Favorites sidebar panel — shows up to 3 most-recent saves with a link to
// the full favorites view when the list is non-empty.
// ---------------------------------------------------------------------------

function FavoritesSidebar() {
	const favorites = useStore(favoritesStore, (state) =>
		Array.from(state.items.values()).reverse(),
	);
	const count = favorites.length;
	const preview = favorites.slice(0, 3);

	return (
		<section
			className="island-shell rise-in rounded-[1.75rem] p-5"
			style={{ animationDelay: "220ms" }}
		>
			<div className="flex items-center justify-between gap-3">
				<div>
					<p className="island-kicker mb-2">Saved stories</p>
					<h2 className="m-0 text-xl font-semibold tracking-tight text-[var(--sea-ink)]">
						{count === 0 ? "No saves yet" : `${count} saved`}
					</h2>
				</div>
				{count > 0 ? (
					<Link
						to="/favorites"
						className="rounded-full border border-[rgba(50,143,151,0.35)] bg-[rgba(79,184,178,0.14)] px-3 py-1 text-xs font-semibold tracking-[0.12em] text-[var(--lagoon-deep)] no-underline uppercase"
					>
						View all
					</Link>
				) : null}
			</div>

			{count === 0 ? (
				<p className="m-0 mt-3 text-sm leading-6 text-[var(--sea-ink-soft)]">
					Hit the star on any story card to save it here. Your saves persist
					across sessions.
				</p>
			) : (
				<ul className="mt-4 list-none m-0 p-0 space-y-3">
					{preview.map((story) => (
						<li key={story.id} className="flex items-start gap-2.5">
							<span
								aria-hidden="true"
								className="mt-0.5 text-[var(--lagoon-deep)] text-sm"
							>
								★
							</span>
							<a
								href={
									story.url ??
									`https://news.ycombinator.com/item?id=${story.id}`
								}
								target="_blank"
								rel="noreferrer"
								className="text-sm font-semibold leading-5 text-[var(--sea-ink)] no-underline hover:text-[var(--lagoon-deep)] line-clamp-2"
							>
								{story.title ?? "Untitled story"}
							</a>
						</li>
					))}
					{count > 3 ? (
						<li>
							<Link
								to="/favorites"
								className="text-sm font-semibold text-[var(--lagoon-deep)] no-underline hover:underline"
							>
								+{count - 3} more &rarr;
							</Link>
						</li>
					) : null}
				</ul>
			)}
		</section>
	);
}
