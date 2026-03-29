import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import {
	feedStoriesQueryOptions,
	type HackerNewsFeedKey,
	type HackerNewsStoryRecord,
} from "#/lib/hacker-news/queries";

const STORY_PREVIEW_LIMIT = 12;
const RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat("en", {
	numeric: "auto",
});

export const Route = createFileRoute("/")({
	component: App,
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(
			feedStoriesQueryOptions("top", STORY_PREVIEW_LIMIT),
		),
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

function getDiscussionUrl(storyId: number) {
	return `https://news.ycombinator.com/item?id=${storyId}`;
}

function stripHtml(input: string | null) {
	if (!input) {
		return "";
	}

	return input
		.replace(/<[^>]+>/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function formatStoryAge(unixTime: number | null) {
	if (!unixTime) {
		return "Fresh";
	}

	const elapsedSeconds = unixTime - Math.floor(Date.now() / 1000);

	if (Math.abs(elapsedSeconds) < 60) {
		return "Just now";
	}

	const minutes = Math.round(elapsedSeconds / 60);
	if (Math.abs(minutes) < 60) {
		return RELATIVE_TIME_FORMATTER.format(minutes, "minute");
	}

	const hours = Math.round(minutes / 60);
	if (Math.abs(hours) < 24) {
		return RELATIVE_TIME_FORMATTER.format(hours, "hour");
	}

	const days = Math.round(hours / 24);
	return RELATIVE_TIME_FORMATTER.format(days, "day");
}

function getStoryDomain(url: string | null) {
	if (!url) {
		return "news.ycombinator.com";
	}

	try {
		return (
			new URL(url).hostname.replace(/^www\./, "") || "news.ycombinator.com"
		);
	} catch {
		return "news.ycombinator.com";
	}
}

function getStorySummary(story: HackerNewsStoryRecord) {
	const textPreview = stripHtml(story.text).slice(0, 160);

	if (textPreview.length > 0) {
		return textPreview;
	}

	if (story.url) {
		return "Open the source article or jump straight into the Hacker News thread.";
	}

	return "This post lives entirely on Hacker News, so the discussion link is the primary reading path.";
}

function getStoryTitle(story: HackerNewsStoryRecord) {
	return story.title?.trim() || "Untitled Hacker News story";
}

function App() {
	const [activeFeed, setActiveFeed] = useState<HackerNewsFeedKey>("top");
	const activeFeedMeta =
		feedTabs.find((feed) => feed.key === activeFeed) ?? feedTabs[0];
	const activeFeedQuery = useQuery(
		feedStoriesQueryOptions(activeFeed, STORY_PREVIEW_LIMIT),
	);
	const activeStories = activeFeedQuery.data?.stories ?? [];
	const activeStatus = activeFeedQuery.isPending
		? "loading"
		: activeFeedQuery.isError
			? "error"
			: activeStories.length === 0
				? "empty"
				: "ready";

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
									? activeFeedQuery.isFetching
										? "Refreshing feed"
										: "Live feed"
									: activeStatus === "loading"
										? "Loading surface"
										: activeStatus === "empty"
											? "Empty surface"
											: "Recovery surface"}
							</span>
						</div>
					</div>

					{activeStatus === "ready" ? (
						<div className="space-y-3">
							{activeStories.map((story, index) => (
								<article
									key={story.id}
									className="island-shell rise-in rounded-[1.6rem] p-4 sm:p-5"
									style={{ animationDelay: `${index * 80 + 120}ms` }}
								>
									<div className="flex items-start gap-3 sm:gap-4">
										<div className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl border border-[var(--chip-line)] bg-[var(--chip-bg)] text-sm font-bold tracking-[0.16em] text-[var(--kicker)]">
											{String(index + 1).padStart(2, "0")}
										</div>

										<div className="min-w-0 flex-1">
											<div className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-[0.12em] text-[var(--kicker)] uppercase">
												<span>{getStoryDomain(story.url)}</span>
												<span className="text-[var(--sea-ink-soft)]">/</span>
												<span>{formatStoryAge(story.time)}</span>
											</div>
											<h3 className="m-0 mt-2 text-lg leading-tight font-semibold text-[var(--sea-ink)] sm:text-xl">
												{getStoryTitle(story)}
											</h3>
											<p className="m-0 mt-3 text-sm leading-6 text-[var(--sea-ink-soft)]">
												{getStorySummary(story)}
											</p>

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
											</div>
										</div>
									</div>
								</article>
							))}
						</div>
					) : null}

					{activeStatus === "loading" ? (
						<div className="space-y-3">
							{[0, 1, 2].map((item) => (
								<article
									key={item}
									className="island-shell rise-in rounded-[1.6rem] p-4 sm:p-5"
									style={{ animationDelay: `${item * 70 + 100}ms` }}
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
							))}
						</div>
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
									onClick={() => activeFeedQuery.refetch()}
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
									onClick={() => activeFeedQuery.refetch()}
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
								TanStack Query now owns feed caching, refetching, and request
								state so the next passes can focus on story modeling and saved
								items.
							</p>
						</div>
					</section>

					<section
						className="island-shell rise-in rounded-[1.75rem] p-5"
						style={{ animationDelay: "220ms" }}
					>
						<div className="flex items-center justify-between gap-3">
							<div>
								<p className="island-kicker mb-2">Saved stories</p>
								<h2 className="m-0 text-xl font-semibold tracking-tight text-[var(--sea-ink)]">
									Empty state placeholder
								</h2>
							</div>
							<span className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1 text-xs font-semibold tracking-[0.14em] text-[var(--kicker)] uppercase">
								Next
							</span>
						</div>
						<p className="m-0 mt-3 text-sm leading-6 text-[var(--sea-ink-soft)]">
							Favorites are not wired yet, but the main screen now has a
							dedicated empty surface where saved stories can land without
							reshaping the layout.
						</p>
					</section>
				</aside>
			</section>
		</main>
	);
}
