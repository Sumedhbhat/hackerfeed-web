import { Button } from "@hackerfeed/ui/atoms/Button";
import { Icon } from "@hackerfeed/ui/atoms/Icon";
import { TextLink } from "@hackerfeed/ui/atoms/Link";
import { PageContainer } from "@hackerfeed/ui/atoms/PageContainer";
import { PaperList } from "@hackerfeed/ui/atoms/PaperList";
import { ReadingList } from "@hackerfeed/ui/atoms/ReadingList";
import { Stack } from "@hackerfeed/ui/atoms/Stack";
import { TabPanel, Tabs } from "@hackerfeed/ui/atoms/Tabs";
import { Text } from "@hackerfeed/ui/atoms/Text";
import { ConfirmButton } from "@hackerfeed/ui/molecules/ConfirmButton";
import { EmptyState } from "@hackerfeed/ui/molecules/EmptyState";
import { InlineNotice } from "@hackerfeed/ui/molecules/InlineNotice";
import { PageHeader } from "@hackerfeed/ui/molecules/PageHeader";
import { SearchField } from "@hackerfeed/ui/molecules/SearchField";
import { SortToolbar } from "@hackerfeed/ui/molecules/SortToolbar";
import { ArrowRight, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { FavoritesTabs } from "#/components/organisms/favorites/FavoritesTabs";
import { PaperRow } from "#/components/organisms/papers/PaperRow";
import { StoryCard } from "#/components/organisms/story/StoryCard";
import { useFavorites } from "#/hooks/useFavorites";
import { usePaperFavorites } from "#/hooks/usePaperFavorites";
import { useViewActivity } from "#/hooks/useViewActivity";
import { matchesFilters } from "#/lib/papers/presentation";
import type { FavoritesType } from "#/routes/favorites";

type SortOrder = "newest" | "oldest" | "score";

const TYPES = ["stories", "papers"] as const;

type FavoritesPageProps = {
	activeType?: FavoritesType;
	onTypeChange?: (type: FavoritesType) => void;
};

export function FavoritesPage({
	activeType: requestedType,
	onTypeChange = () => undefined,
}: FavoritesPageProps) {
	const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
	const [query, setQuery] = useState("");
	const stories = useFavorites();
	const papers = usePaperFavorites();
	// Without a tab in the URL, open the one that has something in it. With
	// no saved stories, show Papers while they load or fail, so the reader sees
	// "loading" or the error rather than a premature "nothing saved".
	const activeType: FavoritesType =
		requestedType ??
		(stories.count === 0 &&
		(papers.count > 0 || papers.isLoading || Boolean(papers.error))
			? "papers"
			: "stories");
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

	const needle = query.trim().toLocaleLowerCase();
	const visibleStories = needle
		? sortedStories.filter((story) =>
				[story.title, story.url, story.by]
					.join(" ")
					.toLocaleLowerCase()
					.includes(needle),
			)
		: sortedStories;
	const visiblePapers = needle
		? sortedPapers.filter((paper) => matchesFilters(paper, needle))
		: sortedPapers;
	const visibleCount = isStories ? visibleStories.length : visiblePapers.length;

	function clearAll() {
		if (isStories) stories.clearAllFavorites();
		else papers.clearAll();
	}

	const browseLabel = `Browse ${isStories ? "stories" : "papers"}`;

	return (
		<PageContainer>
			<Tabs value={activeType} onValueChange={onTypeChange}>
				<Stack gap="lg">
					<PageHeader title="Saved">
						<FavoritesTabs />
					</PageHeader>

					{TYPES.map((type) => (
						<TabPanel key={type} value={type}>
							{!isStories && papers.isLoading ? (
								<Text as="output" tone="soft">
									Loading saved papers...
								</Text>
							) : !isStories && papers.error && activeCount === 0 ? (
								<InlineNotice
									role="alert"
									message="Could not load saved favorites."
									action={
										<Button variant="secondary" onClick={papers.refresh}>
											<Icon icon={RefreshCw} /> Refresh saved favorites
										</Button>
									}
								/>
							) : activeCount === 0 ? (
								<EmptyState
									title={`No saved ${isStories ? "stories" : "papers"} yet`}
									headingSize="section"
									description={`${browseLabel} and press Save on anything you want to keep.`}
									action={
										<TextLink to={isStories ? "/" : "/papers"} variant="accent">
											{browseLabel} <Icon icon={ArrowRight} />
										</TextLink>
									}
								/>
							) : (
								<Stack gap="md">
									<SearchField
										value={query}
										onChange={setQuery}
										label={`Search saved ${isStories ? "stories" : "papers"}`}
										placeholder={
											isStories ? "Search saved stories" : "Search saved papers"
										}
									/>
									<SortToolbar
										options={[
											{ value: "newest", label: "Newest" },
											{ value: "oldest", label: "Oldest" },
											{
												value: "score",
												label: isStories ? "Top score" : "Upvotes",
											},
										]}
										value={sortOrder}
										onChange={setSortOrder}
										action={
											<ConfirmButton
												title={`Clear all ${isStories ? "saved stories" : "saved papers"}?`}
												description="This cannot be undone."
												confirmLabel="Clear"
												onConfirm={clearAll}
												disabled={!isStories && !papers.canClear}
											>
												{!isStories && papers.isClearPending
													? "Clearing..."
													: `Clear ${isStories ? "stories" : "papers"}`}
											</ConfirmButton>
										}
									/>
									{papers.error && !isStories ? (
										<InlineNotice
											message={papers.error}
											action={
												<Button
													variant="icon"
													onClick={papers.refresh}
													aria-label="Refresh saved favorites"
													title="Refresh saved favorites"
												>
													<Icon icon={RefreshCw} />
												</Button>
											}
										/>
									) : null}
									{visibleCount === 0 ? (
										<Text tone="soft">
											No saved {isStories ? "stories" : "papers"} match “
											{query.trim()}”.
										</Text>
									) : isStories ? (
										<ReadingList aria-label="Saved stories">
											{visibleStories.map((story) => (
												<StoryCard
													key={story.id}
													story={story}
													markSaved={false}
												/>
											))}
										</ReadingList>
									) : (
										<PaperList aria-label="Saved papers">
											{visiblePapers.map((paper) => (
												<PaperRow
													key={paper.arxivId}
													paper={paper}
													markSaved={false}
													canFavorite={papers.canFavorite}
													isFavorited={papers.isFavorited(paper.arxivId)}
													isPending={
														papers.isPending(paper.arxivId) ||
														papers.isClearPending
													}
													onToggleFavorite={() => papers.toggleFavorite(paper)}
													onView={(action) =>
														recordPaperView(paper.arxivId, action)
													}
												/>
											))}
										</PaperList>
									)}
								</Stack>
							)}
						</TabPanel>
					))}
				</Stack>
			</Tabs>
		</PageContainer>
	);
}
