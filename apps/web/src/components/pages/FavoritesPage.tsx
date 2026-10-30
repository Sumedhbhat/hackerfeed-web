import { Button } from "@hackerfeed/ui/atoms/Button";
import { Icon } from "@hackerfeed/ui/atoms/Icon";
import { TextLink } from "@hackerfeed/ui/atoms/Link";
import { PageContainer } from "@hackerfeed/ui/atoms/PageContainer";
import { PaperList } from "@hackerfeed/ui/atoms/PaperList";
import { Stack } from "@hackerfeed/ui/atoms/Stack";
import { TabPanel, Tabs } from "@hackerfeed/ui/atoms/Tabs";
import { Text } from "@hackerfeed/ui/atoms/Text";
import { ConfirmButton } from "@hackerfeed/ui/molecules/ConfirmButton";
import { EmptyState } from "@hackerfeed/ui/molecules/EmptyState";
import { InlineNotice } from "@hackerfeed/ui/molecules/InlineNotice";
import { SortToolbar } from "@hackerfeed/ui/molecules/SortToolbar";
import { ArrowRight, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { FavoritesTabs } from "#/components/organisms/favorites/FavoritesTabs";
import { PaperRow } from "#/components/organisms/papers/PaperRow";
import { StoryCard } from "#/components/organisms/story/StoryCard";
import { useFavorites } from "#/hooks/useFavorites";
import { usePaperFavorites } from "#/hooks/usePaperFavorites";
import { useViewActivity } from "#/hooks/useViewActivity";
import type { FavoritesType } from "#/routes/favorites";

type SortOrder = "newest" | "oldest" | "score";

const TYPES = ["stories", "papers"] as const;

type FavoritesPageProps = {
	activeType?: FavoritesType;
	onTypeChange?: (type: FavoritesType) => void;
};

export function FavoritesPage({
	activeType = "stories",
	onTypeChange = () => undefined,
}: FavoritesPageProps) {
	const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
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

	function clearAll() {
		if (isStories) stories.clearAllFavorites();
		else papers.clearAll();
	}

	const browseLabel = `Browse ${isStories ? "the feed" : "papers"}`;

	return (
		<PageContainer spacing="compact">
			<Tabs value={activeType} onValueChange={onTypeChange}>
				<Stack gap="lg">
					<FavoritesTabs />

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
									kicker="Nothing saved yet"
									title={`Your saved ${isStories ? "stories" : "papers"} list is empty.`}
									description={`${browseLabel} and use the star to save items here.`}
									action={
										<TextLink to={isStories ? "/" : "/papers"} variant="accent">
											{browseLabel} <Icon icon={ArrowRight} />
										</TextLink>
									}
								/>
							) : (
								<>
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
									{isStories ? (
										<Stack as="section" gap="md" aria-label="Saved stories">
											{sortedStories.map((story, index) => (
												<StoryCard
													key={story.id}
													story={story}
													animationDelay={index * 50 + 60}
												/>
											))}
										</Stack>
									) : (
										<PaperList aria-label="Saved papers">
											{sortedPapers.map((paper, index) => (
												<PaperRow
													key={paper.arxivId}
													paper={paper}
													index={index}
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
								</>
							)}
						</TabPanel>
					))}
				</Stack>
			</Tabs>
		</PageContainer>
	);
}
