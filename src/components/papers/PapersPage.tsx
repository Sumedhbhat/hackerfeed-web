import {
	ArrowUpRight,
	BookOpen,
	CalendarDays,
	Code2,
	ExternalLink,
	RefreshCw,
	Search,
	Sparkles,
	ThumbsUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { usePaperEdition } from "#/hooks/usePaperEdition";
import type { PaperEdition, PaperFeedPaper } from "#/lib/papers/schemas";

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

function PaperSummary({
	paper,
	compact = false,
}: {
	paper: PaperFeedPaper;
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
						<Sparkles size={13} aria-hidden="true" />
					) : (
						<BookOpen size={13} aria-hidden="true" />
					)}
					{showAbstract ? "Show AI summary" : "Show abstract"}
				</button>
			) : null}
		</>
	);
}

function PaperSignals({ paper }: { paper: PaperFeedPaper }) {
	return (
		<div className="papers-signals">
			<span>
				<ThumbsUp size={13} aria-hidden="true" /> {paper.upvotes}
			</span>
			<span>
				<CalendarDays size={13} aria-hidden="true" />{" "}
				{formatPaperDate(paper.paperPublishedAt)}
			</span>
			{paper.githubRepo ? (
				<span>
					<Code2 size={13} aria-hidden="true" /> Code
				</span>
			) : null}
		</div>
	);
}

function ExternalPaperLinks({
	paper,
	compact = false,
}: {
	paper: PaperFeedPaper;
	compact?: boolean;
}) {
	return (
		<div className={`papers-external-links${compact ? " is-compact" : ""}`}>
			<a href={paper.paperUrl} target="_blank" rel="noreferrer">
				Paper <ArrowUpRight size={15} aria-hidden="true" />
			</a>
			{paper.projectPage ? (
				<a href={paper.projectPage} target="_blank" rel="noreferrer">
					Project <ExternalLink size={13} aria-hidden="true" />
				</a>
			) : null}
			{paper.githubRepo ? (
				<a href={paper.githubRepo} target="_blank" rel="noreferrer">
					Code <ExternalLink size={13} aria-hidden="true" />
				</a>
			) : null}
		</div>
	);
}

function LeadPaper({ paper }: { paper: PaperFeedPaper }) {
	return (
		<article className="papers-lead rise-in">
			<div className="papers-lead-copy">
				<p className="papers-section-label">Featured paper</p>
				<h1>{paper.title}</h1>
				<p className="papers-authors">{formatAuthors(paper.authors)}</p>
				<PaperSummary paper={paper} />
				<footer className="papers-lead-footer">
					<PaperSignals paper={paper} />
					<ExternalPaperLinks paper={paper} />
				</footer>
			</div>
			<div className="papers-lead-art" aria-hidden="true">
				<div className="papers-orbit papers-orbit-one" />
				<div className="papers-orbit papers-orbit-two" />
				<div className="papers-cube">
					<i />
					<i />
					<i />
				</div>
				<span>
					latent
					<br />
					space
				</span>
			</div>
		</article>
	);
}

function PaperRow({ paper, index }: { paper: PaperFeedPaper; index: number }) {
	return (
		<article
			className="papers-row rise-in"
			style={{ animationDelay: `${Math.min(index * 35, 210)}ms` }}
		>
			<div className="papers-row-copy">
				<h2>{paper.title}</h2>
				<p className="papers-authors">{formatAuthors(paper.authors)}</p>
				<PaperSummary paper={paper} compact />
			</div>
			<aside className="papers-row-aside">
				<PaperSignals paper={paper} />
				<div className="papers-keyword-stack">
					{paper.keywords.slice(0, 3).map((keyword) => (
						<span key={keyword}>{keyword}</span>
					))}
				</div>
				<ExternalPaperLinks paper={paper} compact />
			</aside>
		</article>
	);
}

export function PapersFeed({
	edition,
	filters,
	onFiltersChange,
}: PapersFeedProps) {
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
	const [leadPaper, ...paperRows] = visiblePapers;
	const selectedDate = filters.date ?? edition.editionDate ?? "";

	return (
		<main className="papers-page">
			<div className="papers-shell">
				<section className="papers-toolbar" aria-label="Find a paper edition">
					<label className="papers-search">
						<Search size={15} aria-hidden="true" />
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
						<CalendarDays size={14} aria-hidden="true" />
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

				{leadPaper ? (
					<>
						<LeadPaper paper={leadPaper} />
						<section aria-label="More papers">
							{paperRows.map((paper, index) => (
								<PaperRow paper={paper} index={index} key={paper.arxivId} />
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
						<p>No papers match these filters.</p>
						<button
							type="button"
							onClick={() => onFiltersChange({ date: filters.date })}
						>
							Clear search and topic
						</button>
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

	if (!edition.data.editionDate || edition.data.papers.length === 0) {
		return (
			<main className="papers-page">
				<section className="papers-shell papers-state">
					<p>
						{filters.date
							? "No successful paper edition exists for this date."
							: "No paper editions have been ingested yet."}
					</p>
					{filters.date ? (
						<button
							type="button"
							onClick={() => onFiltersChange({ ...filters, date: undefined })}
						>
							View latest edition
						</button>
					) : null}
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
