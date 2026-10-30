import type { PaperEdition } from "@hackerfeed/contracts/papers";
import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "#/components/atoms/Button";
import { Icon } from "#/components/atoms/Icon";
import { PaperList } from "#/components/atoms/PaperList";
import { InlineNotice } from "#/components/molecules/InlineNotice";
import { LoadMoreButton } from "#/components/molecules/LoadMoreButton";
import { PaperEditionToolbar } from "#/components/molecules/PaperEditionToolbar";
import { PaperFeedMessage } from "#/components/molecules/PaperFeedMessage";
import { PaperPageShell } from "#/components/molecules/PaperPageShell";
import { PaperTopicNav } from "#/components/molecules/PaperTopicNav";
import { usePaperFavorites } from "#/hooks/usePaperFavorites";
import { useViewActivity } from "#/hooks/useViewActivity";
import { matchesFilters } from "#/lib/papers/presentation";
import { PaperRow } from "./PaperRow";

export type PaperFilters = {
	date?: string;
	query?: string;
	topic?: string;
};

type PapersFeedProps = {
	edition: PaperEdition;
	filters: PaperFilters;
	onFiltersChange: (filters: PaperFilters) => void;
};

const INITIAL_PAPER_COUNT = 10;

export function PapersFeed({
	edition,
	filters,
	onFiltersChange,
}: PapersFeedProps) {
	const favorites = usePaperFavorites();
	const { recordPaperView } = useViewActivity();
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
		<PaperPageShell>
			<PaperEditionToolbar
				query={filters.query ?? ""}
				date={selectedDate}
				onQueryChange={(value) =>
					onFiltersChange({ ...filters, query: value || undefined })
				}
				onDateChange={(value) =>
					onFiltersChange({
						...filters,
						date: value || undefined,
						topic: undefined,
					})
				}
			/>

			<PaperTopicNav
				totalCount={edition.papers.length}
				topics={edition.popularKeywords.slice(0, 8)}
				selected={filters.topic}
				onSelect={(topic) => onFiltersChange({ ...filters, topic })}
			/>
			{favorites.error ? (
				<InlineNotice
					message={favorites.error}
					action={
						<Button
							variant="icon"
							onClick={favorites.refresh}
							aria-label="Refresh saved favorites"
							title="Refresh saved favorites"
						>
							<Icon icon={RefreshCw} />
						</Button>
					}
				/>
			) : null}

			{visiblePapers.length > 0 ? (
				<>
					<PaperList aria-label="Papers">
						{visiblePapers.map((paper, index) => (
							<PaperRow
								canFavorite={favorites.canFavorite}
								index={index}
								isFavorited={favorites.isFavorited(paper.arxivId)}
								isPending={favorites.isPending(paper.arxivId)}
								key={paper.arxivId}
								onToggleFavorite={() => favorites.toggleFavorite(paper)}
								onView={(action) => recordPaperView(paper.arxivId, action)}
								paper={paper}
							/>
						))}
					</PaperList>
					{visibleCount < filteredPapers.length ? (
						<LoadMoreButton
							label="Load more papers"
							onClick={() =>
								setVisibleCount((count) => count + INITIAL_PAPER_COUNT)
							}
						/>
					) : null}
				</>
			) : (
				<PaperFeedMessage message={emptyMessage}>
					{hasPapers && hasActiveFilters ? (
						<Button
							variant="secondary"
							onClick={() => onFiltersChange({ date: filters.date })}
						>
							Clear search and topic
						</Button>
					) : null}
					{!hasPapers && filters.date ? (
						<Button
							variant="secondary"
							onClick={() => onFiltersChange({ ...filters, date: undefined })}
						>
							View latest edition
						</Button>
					) : null}
				</PaperFeedMessage>
			)}
		</PaperPageShell>
	);
}
