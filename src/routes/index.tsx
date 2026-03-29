import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({ component: App });

type FeedKey = "top" | "new" | "best";

type PreviewStory = {
	id: number;
	rank: string;
	title: string;
	domain: string;
	points: number;
	author: string;
	age: string;
	comments: number;
	summary: string;
	articleUrl: string;
	discussionUrl: string;
};

const feedTabs: Array<{ key: FeedKey; label: string; strap: string }> = [
	{ key: "top", label: "Top", strap: "What everyone is reading" },
	{ key: "new", label: "New", strap: "Fresh links rolling in" },
	{ key: "best", label: "Best", strap: "Long-tail standouts" },
];

const previewStories: Record<FeedKey, PreviewStory[]> = {
	top: [
		{
			id: 1,
			rank: "01",
			title: "A calm reading shell for Hacker News on the go",
			domain: "product-notes.dev",
			points: 312,
			author: "pg",
			age: "12m ago",
			comments: 84,
			summary:
				"A mobile-first layout that keeps the story list legible, action-first, and easy to resume after opening links.",
			articleUrl: "https://news.ycombinator.com/",
			discussionUrl: "https://news.ycombinator.com/item?id=1",
		},
		{
			id: 2,
			rank: "02",
			title: "Designing fast feed readers with progressive story hydration",
			domain: "latency.report",
			points: 228,
			author: "dang",
			age: "26m ago",
			comments: 41,
			summary:
				"The next pass adds TanStack Query-backed fetching, but the shell is already tuned for compact scanning and thumb reach.",
			articleUrl: "https://github.com/HackerNews/API",
			discussionUrl: "https://news.ycombinator.com/item?id=2",
		},
		{
			id: 3,
			rank: "03",
			title: "Why touch-friendly metadata rows matter on dense content apps",
			domain: "interface.fieldnotes",
			points: 185,
			author: "sama",
			age: "44m ago",
			comments: 19,
			summary:
				"Small interaction decisions shape whether a feed feels like a utility or a chore, especially on narrow screens.",
			articleUrl: "https://tanstack.com/query/latest",
			discussionUrl: "https://news.ycombinator.com/item?id=3",
		},
	],
	new: [],
	best: [],
};

const feedStates: Record<
	FeedKey,
	{
		title: string;
		description: string;
		status: "ready" | "loading" | "error";
	}
> = {
	top: {
		title: "Top stories",
		description:
			"A story-first list tuned for quick scanning and low-friction reading actions.",
		status: "ready",
	},
	new: {
		title: "New stories",
		description:
			"This placeholder state reserves space for incremental loading without shifting the shell.",
		status: "loading",
	},
	best: {
		title: "Best stories",
		description:
			"This placeholder error state gives the main screen a dedicated recovery surface.",
		status: "error",
	},
};

function App() {
	const [activeFeed, setActiveFeed] = useState<FeedKey>("top");
	const activeState = feedStates[activeFeed];

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
							HackerFeed now opens as an app screen instead of a starter landing
							page, with feed switching, touch-sized story cards, and stateful
							panels ready for the upcoming data layer.
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
									{activeState.title}
								</h2>
								<p className="m-0 mt-2 max-w-2xl text-sm leading-6 text-[var(--sea-ink-soft)]">
									{activeState.description}
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
							<span>
								{feedTabs.find((feed) => feed.key === activeFeed)?.strap}
							</span>
							<span className="text-[var(--sea-ink-soft)]">/</span>
							<span>
								{activeState.status === "ready"
									? "List preview"
									: activeState.status === "loading"
										? "Loading surface"
										: "Recovery surface"}
							</span>
						</div>
					</div>

					{activeState.status === "ready" ? (
						<div className="space-y-3">
							{previewStories[activeFeed].map((story, index) => (
								<article
									key={story.id}
									className="island-shell rise-in rounded-[1.6rem] p-4 sm:p-5"
									style={{ animationDelay: `${index * 80 + 120}ms` }}
								>
									<div className="flex items-start gap-3 sm:gap-4">
										<div className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl border border-[var(--chip-line)] bg-[var(--chip-bg)] text-sm font-bold tracking-[0.16em] text-[var(--kicker)]">
											{story.rank}
										</div>

										<div className="min-w-0 flex-1">
											<div className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-[0.12em] text-[var(--kicker)] uppercase">
												<span>{story.domain}</span>
												<span className="text-[var(--sea-ink-soft)]">/</span>
												<span>{story.age}</span>
											</div>
											<h3 className="m-0 mt-2 text-lg leading-tight font-semibold text-[var(--sea-ink)] sm:text-xl">
												{story.title}
											</h3>
											<p className="m-0 mt-3 text-sm leading-6 text-[var(--sea-ink-soft)]">
												{story.summary}
											</p>

											<div className="mt-4 flex flex-wrap gap-2 text-sm text-[var(--sea-ink-soft)]">
												<span className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5">
													{story.points} points
												</span>
												<span className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5">
													by {story.author}
												</span>
												<span className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5">
													{story.comments} comments
												</span>
											</div>

											<div className="mt-4 flex flex-wrap gap-2">
												<a
													href={story.articleUrl}
													target="_blank"
													rel="noreferrer"
													className="rounded-full border border-[rgba(50,143,151,0.35)] bg-[rgba(79,184,178,0.14)] px-4 py-2 text-sm font-semibold text-[var(--lagoon-deep)] no-underline hover:-translate-y-0.5 hover:bg-[rgba(79,184,178,0.24)]"
												>
													Read article
												</a>
												<a
													href={story.discussionUrl}
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

					{activeState.status === "loading" ? (
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

					{activeState.status === "error" ? (
						<article className="island-shell rise-in rounded-[1.75rem] p-5 sm:p-6">
							<p className="island-kicker mb-2">Feed unavailable</p>
							<h3 className="m-0 text-xl font-semibold tracking-tight text-[var(--sea-ink)]">
								Couldn't refresh best stories.
							</h3>
							<p className="m-0 mt-3 max-w-xl text-sm leading-6 text-[var(--sea-ink-soft)]">
								The recovery panel already has space for retry messaging,
								stale-cache fallbacks, and offline guidance once the real query
								layer lands.
							</p>
							<div className="mt-5 flex flex-wrap gap-2">
								<button
									type="button"
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
								The shell already reserves room for favorites, pagination, and a
								swappable link-opening layer.
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
