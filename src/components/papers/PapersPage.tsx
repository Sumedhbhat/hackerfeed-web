import {
	BookOpen,
	CalendarDays,
	Code2,
	ExternalLink,
	MessageCircle,
	RefreshCw,
	Search,
	Sparkles,
	Star,
	ThumbsUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { usePaperEdition } from "#/hooks/usePaperEdition";
import { usePaperFavorites } from "#/hooks/usePaperFavorites";
import type { PaperEdition, PaperFeedPaper } from "#/lib/papers/schemas";

export type PaperPresentation = Omit<
	PaperFeedPaper,
	"entryPublishedAt" | "rank"
>;

type PaperFilters = {
	date?: string;
	query?: string;
	topic?: string;
};

type PapersPageProps = {
	filters: PaperFilters;
	onFiltersChange: (filters: PaperFilters) => void;
};

type PapersFeedProps = PapersPageProps & {
	edition: PaperEdition;
};

const INITIAL_PAPER_COUNT = 10;
const CHATGPT_URL = "https://chatgpt.com/";

function formatAuthors(authors: string[]): string {
	if (authors.length === 0) return "Authors unavailable";
	if (authors.length <= 3) return authors.join(", ");

	return `${authors.slice(0, 3).join(", ")} +${authors.length - 3}`;
}

function formatPaperDate(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;

	return new Intl.DateTimeFormat("en", {
		day: "numeric",
		month: "short",
		timeZone: "UTC",
	}).format(date);
}

function matchesFilters(
	paper: PaperFeedPaper,
	query: string,
	topic?: string,
): boolean {
	if (topic && !paper.keywords.includes(topic)) return false;
	if (!query) return true;

	const searchable = [
		paper.title,
		paper.summary,
		...paper.authors,
		...paper.keywords,
	]
		.join(" ")
		.toLocaleLowerCase();

	return searchable.includes(query.toLocaleLowerCase());
}

function buildChatGptPaperDiscussionUrl(paper: PaperPresentation): string {
	const prompt = [
		"I want to discuss this research paper and understand it completely.",
		`Title: ${paper.title}`,
		`Paper URL: ${paper.paperUrl}`,
		paper.projectPage ? `Project page: ${paper.projectPage}` : null,
		paper.githubRepo ? `Code: ${paper.githubRepo}` : null,
		"",
		"Please help me understand the core idea, why it matters, and where its useful.",
		"I will be asking you a huge series of questions about this paper and want them answered.",
	].filter(Boolean);

	const url = new URL(CHATGPT_URL);
	url.searchParams.set("q", prompt.join("\n"));

	return url.toString();
}

function PaperSummary({
	paper,
	compact = false,
}: {
	paper: PaperPresentation;
	compact?: boolean;
}) {
	const [showAbstract, setShowAbstract] = useState(false);
	const canShowAbstract = paper.abstract !== null;

	return (
		<>
			<p className={`papers-summary${compact ? " is-compact" : ""}`}>
				{showAbstract && paper.abstract ? paper.abstract : paper.summary}
			</p>
			{canShowAbstract ? (
				<button
					type="button"
					className="papers-abstract-toggle"
					onClick={() => setShowAbstract((value) => !value)}
				>
					{showAbstract ? (
						<Sparkles size={14} aria-hidden="true" />
					) : (
						<BookOpen size={14} aria-hidden="true" />
					)}
					{showAbstract ? "Show AI summary" : "Show abstract"}
				</button>
			) : null}
		</>
	);
}

function PaperSignals({ paper }: { paper: PaperPresentation }) {
	return (
		<div className="papers-signals">
			<span>
				<ThumbsUp size={14} aria-hidden="true" /> {paper.upvotes}
			</span>
			<span>
				<CalendarDays size={14} aria-hidden="true" />{" "}
				{formatPaperDate(paper.paperPublishedAt)}
			</span>
			{paper.githubRepo ? (
				<span>
					<Code2 size={14} aria-hidden="true" /> Code
				</span>
			) : null}
		</div>
	);
}

function ExternalPaperLinks({
	paper,
	compact = false,
}: {
	paper: PaperPresentation;
	compact?: boolean;
}) {
	return (
		<div className={`papers-external-links${compact ? " is-compact" : ""}`}>
			<a
				className="papers-chat-link"
				href={buildChatGptPaperDiscussionUrl(paper)}
				target="_blank"
				rel="noreferrer"
				aria-label={`Discuss ${paper.title} in ChatGPT`}
			>
				<MessageCircle size={14} aria-hidden="true" />
				Discuss
			</a>
			{paper.projectPage ? (
				<a href={paper.projectPage} target="_blank" rel="noreferrer">
					Project <ExternalLink size={14} aria-hidden="true" />
				</a>
			) : null}
			{paper.githubRepo ? (
				<a href={paper.githubRepo} target="_blank" rel="noreferrer">
					Code <ExternalLink size={14} aria-hidden="true" />
				</a>
			) : null}
		</div>
	);
}

type PaperRowProps = {
	canFavorite: boolean;
	index: number;
	isFavorited: boolean;
	isPending: boolean;
	onToggleFavorite: () => void;
	paper: PaperPresentation;
};

export function PaperRow({
	canFavorite,
	index,
	isFavorited: saved,
	isPending: pending,
	onToggleFavorite,
	paper,
}: PaperRowProps) {
	return (
		<article
			className="papers-card papers-row rise-in"
			style={{ animationDelay: `${Math.min(index * 35, 210)}ms` }}
		>
			<h2>
				<a href={paper.paperUrl} target="_blank" rel="noreferrer">
					{paper.title}
				</a>
			</h2>
			<p className="papers-authors">{formatAuthors(paper.authors)}</p>
			<PaperSummary paper={paper} compact />
			<footer className="papers-row-footer">
				<PaperSignals paper={paper} />
				<div className="papers-row-actions">
					<ExternalPaperLinks paper={paper} compact />
					{canFavorite ? (
						<button
							type="button"
							className={`text-sm transition-colors disabled:cursor-wait disabled:opacity-55 ${
								saved
									? "font-medium text-(--kicker)"
									: "text-(--sea-ink-soft) hover:text-(--sea-ink)"
							}`}
							aria-label={
								saved
									? `Remove ${paper.title} from favorites`
									: `Save ${paper.title} to favorites`
							}
							aria-pressed={saved}
							title={saved ? "Remove from favorites" : "Save to favorites"}
							disabled={pending}
							onClick={onToggleFavorite}
						>
							<Star
								size={14}
								fill={saved ? "currentColor" : "none"}
								aria-hidden="true"
								className={`inline${saved ? " star-pop" : ""}`}
							/>{" "}
							{saved ? "Saved" : "Save"}
						</button>
					) : null}
				</div>
				{paper.keywords.length > 0 ? (
					<ul className="papers-keyword-strip" aria-label="Paper keywords">
						{paper.keywords.map((keyword) => (
							<li key={keyword}>{keyword}</li>
						))}
					</ul>
				) : null}
			</footer>
		</article>
	);
}

export function PapersFeed({
	edition,
	filters,
	onFiltersChange,
}: PapersFeedProps) {
	const favorites = usePaperFavorites();
	const [visibleCount, setVisibleCount] = useState(INITIAL_PAPER_COUNT);
	const query = filters.query?.trim() ?? "";
	const filteredPapers = useMemo(
		() =>
			edition.papers.filter((paper) =>
				matchesFilters(paper, query, filters.topic),
			),
		[edition.papers, filters.topic, query],
	);
	const visiblePapers = filteredPapers.slice(0, visibleCount);
	const selectedDate = filters.date ?? edition.editionDate ?? "";
	const hasPapers = edition.papers.length > 0;
	const hasActiveFilters = Boolean(query || filters.topic);
	const emptyMessage = hasPapers
		? "No papers match these filters."
		: filters.date
			? "No successful paper edition exists for this date."
			: selectedDate
				? "No papers are available for this edition."
				: "No paper editions have been ingested yet.";

	return (
		<main className="papers-page">
			<div className="papers-shell">
				<section className="papers-toolbar" aria-label="Find a paper edition">
					<label className="papers-search">
						<Search size={16} aria-hidden="true" />
						<input
							type="search"
							value={filters.query ?? ""}
							onChange={(event) =>
								onFiltersChange({
									...filters,
									query: event.target.value || undefined,
								})
							}
							placeholder="Search papers, authors, or topics"
							aria-label="Search papers"
						/>
					</label>
					<label className="papers-date">
						<CalendarDays size={16} aria-hidden="true" />
						<input
							type="date"
							value={selectedDate}
							onChange={(event) =>
								onFiltersChange({
									...filters,
									date: event.target.value || undefined,
									topic: undefined,
								})
							}
							aria-label="Choose edition date"
						/>
					</label>
				</section>

				<nav className="papers-topics" aria-label="Popular paper topics">
					<button
						type="button"
						className={!filters.topic ? "is-active" : ""}
						onClick={() => onFiltersChange({ ...filters, topic: undefined })}
					>
						All papers <small>{edition.papers.length}</small>
					</button>
					{edition.popularKeywords.slice(0, 8).map((topic) => (
						<button
							type="button"
							className={filters.topic === topic.keyword ? "is-active" : ""}
							onClick={() =>
								onFiltersChange({ ...filters, topic: topic.keyword })
							}
							key={topic.keyword}
						>
							{topic.keyword} <small>{topic.paperCount}</small>
						</button>
					))}
				</nav>
				{favorites.error ? (
					<output className="papers-favorites-error">
						<span>{favorites.error}</span>
						<button
							type="button"
							onClick={favorites.refresh}
							aria-label="Refresh saved favorites"
							title="Refresh saved favorites"
						>
							<RefreshCw size={14} aria-hidden="true" />
						</button>
					</output>
				) : null}

				{visiblePapers.length > 0 ? (
					<>
						<section className="papers-list" aria-label="Papers">
							{visiblePapers.map((paper, index) => (
								<PaperRow
									canFavorite={favorites.canFavorite}
									index={index}
									isFavorited={favorites.isFavorited(paper.arxivId)}
									isPending={favorites.isPending(paper.arxivId)}
									key={paper.arxivId}
									onToggleFavorite={() => favorites.toggleFavorite(paper)}
									paper={paper}
								/>
							))}
						</section>
						{visibleCount < filteredPapers.length ? (
							<div className="papers-load-more">
								<button
									type="button"
									onClick={() =>
										setVisibleCount((count) => count + INITIAL_PAPER_COUNT)
									}
								>
									Load more papers
								</button>
							</div>
						) : null}
					</>
				) : (
					<section className="papers-state">
						<p>{emptyMessage}</p>
						{hasPapers && hasActiveFilters ? (
							<button
								type="button"
								onClick={() => onFiltersChange({ date: filters.date })}
							>
								Clear search and topic
							</button>
						) : null}
						{!hasPapers && filters.date ? (
							<button
								type="button"
								onClick={() => onFiltersChange({ ...filters, date: undefined })}
							>
								View latest edition
							</button>
						) : null}
					</section>
				)}
			</div>
		</main>
	);
}

export function PapersPage({ filters, onFiltersChange }: PapersPageProps) {
	const edition = usePaperEdition(filters.date);

	if (edition.isPending) {
		return (
			<main className="papers-page">
				<output
					className="papers-shell papers-loading"
					aria-label="Loading papers"
				>
					<div />
					<div />
					<div />
				</output>
			</main>
		);
	}

	if (edition.isError) {
		return (
			<main className="papers-page">
				<section className="papers-shell papers-state">
					<p>HackerFeed couldn&apos;t load this paper edition.</p>
					<button type="button" onClick={() => edition.refetch()}>
						<RefreshCw size={14} aria-hidden="true" /> Try again
					</button>
				</section>
			</main>
		);
	}

	return (
		<PapersFeed
			edition={edition.data}
			filters={filters}
			onFiltersChange={onFiltersChange}
		/>
	);
}
