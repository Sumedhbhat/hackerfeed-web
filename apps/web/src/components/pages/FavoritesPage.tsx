import type { SavedPaper } from "@hackerfeed/contracts/paper-favorites";
import type { HackerNewsStoryRecord } from "@hackerfeed/hacker-news/records";
import { Button } from "@hackerfeed/ui/atoms/Button";
import { Icon } from "@hackerfeed/ui/atoms/Icon";
import { TextLink } from "@hackerfeed/ui/atoms/Link";
import { LiveStatus } from "@hackerfeed/ui/atoms/LiveStatus";
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
import { useEffect, useMemo, useRef, useState } from "react";
import { FavoritesTabs } from "#/components/organisms/favorites/FavoritesTabs";
import { PaperRow } from "#/components/organisms/papers/PaperRow";
import { StoryCard } from "#/components/organisms/story/StoryCard";
import { useFavorites } from "#/hooks/useFavorites";
import { usePaperFavorites } from "#/hooks/usePaperFavorites";
import { useRestoreReturnFocus } from "#/hooks/useRestoreReturnFocus";
import { useResultCountAnnouncement } from "#/hooks/useResultCountAnnouncement";
import { useViewActivity } from "#/hooks/useViewActivity";
import { focusFirstIn, focusIsLost } from "#/lib/a11y/focus";
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
	const autoType: FavoritesType =
		stories.count === 0 &&
		(papers.count > 0 || papers.isLoading || Boolean(papers.error))
			? "papers"
			: "stories";
	// Once the automatic choice has found something, keep it: unsaving the last
	// story must not flip the page to Papers under the reader's focus.
	const settledTypeRef = useRef<FavoritesType | null>(null);
	if (
		!settledTypeRef.current &&
		(autoType === "stories" ? stories.count : papers.count) > 0
	) {
		settledTypeRef.current = autoType;
	}
	const activeType: FavoritesType =
		requestedType ?? settledTypeRef.current ?? autoType;
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
	const removal = useRemovalFeedback(activeType, activeCount);
	const lastRemoved = useLastRemoved(
		stories.getFavorites(),
		papers.savedPapers,
	);
	const [undone, setUndone] = useState<string | null>(null);
	const [undoMessage, setUndoMessage] = useState("");
	useRestoreReturnFocus(activeCount > 0);

	/** Put the last unsaved item back, then focus its Saved button. */
	function undoRemove() {
		if (!lastRemoved) return;
		if (lastRemoved.kind === "story") stories.toggleFavorite(lastRemoved.item);
		else papers.toggleFavorite(lastRemoved.item);
		const title = lastRemoved.item.title;
		setUndone(lastRemoved.key);
		setUndoMessage(`Put “${title}” back in Saved.`);
		// The row comes back when the save completes, which can take a moment
		// (papers go through the server); focus its Saved button once it's there.
		restoredTitleRef.current = title;
	}
	const restoredTitleRef = useRef<string | null>(null);
	useEffect(() => {
		const title = restoredTitleRef.current;
		if (!title) return;
		const button = [
			...document.querySelectorAll<HTMLElement>("button[aria-label]"),
		].find(
			(element) => element.getAttribute("aria-label") === `Saved ${title}`,
		);
		if (!button) return;
		restoredTitleRef.current = null;
		button.focus();
	});
	const undoable =
		lastRemoved &&
		lastRemoved.kind === (isStories ? "story" : "paper") &&
		undone !== lastRemoved.key
			? lastRemoved
			: null;
	const searchResult = useResultCountAnnouncement(
		visibleCount,
		isStories
			? ["saved story", "saved stories"]
			: ["saved paper", "saved papers"],
		needle,
	);

	function clearAll() {
		if (isStories) stories.clearAllFavorites();
		else papers.clearAll();
	}

	const browseLabel = `Browse ${isStories ? "stories" : "papers"}`;

	return (
		<PageContainer>
			<LiveStatus message={removal} />
			<LiveStatus message={undoMessage} />
			<LiveStatus message={searchResult} />
			<Tabs value={activeType} onValueChange={onTypeChange}>
				<Stack gap="lg">
					<PageHeader title="Saved">
						<FavoritesTabs />
					</PageHeader>

					{undoable ? (
						<InlineNotice
							boxed
							message={`Removed “${undoable.item.title}” from Saved.`}
							action={
								<Button
									variant="secondary"
									aria-label={`Undo: put “${undoable.item.title}” back in Saved`}
									onClick={undoRemove}
								>
									Undo
								</Button>
							}
						/>
					) : null}

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
										<ReadingList id="saved-list" aria-label="Saved stories">
											{visibleStories.map((story) => (
												<StoryCard
													key={story.id}
													story={story}
													markSaved={false}
												/>
											))}
										</ReadingList>
									) : (
										<PaperList id="saved-list" aria-label="Saved papers">
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

/**
 * Unsaving removes the row, and the focused Save button with it. Say what
 * happened (WCAG 4.1.3) and put focus on the row that took its place (the
 * next one, or the previous one if it was last), or on the empty state's
 * link when nothing is left (WCAG 2.4.3).
 */
function useRemovalFeedback(type: FavoritesType, count: number) {
	const [message, setMessage] = useState("");
	const lastRef = useRef({ type, count });
	// The position of the row that last had focus in the saved list.
	const focusedRowRef = useRef(0);
	useEffect(() => {
		const onFocusIn = (event: FocusEvent) => {
			const list = document.getElementById("saved-list");
			const row = (event.target as Element | null)?.closest("#saved-list > li");
			if (list && row) focusedRowRef.current = [...list.children].indexOf(row);
		};
		document.addEventListener("focusin", onFocusIn);
		return () => document.removeEventListener("focusin", onFocusIn);
	}, []);
	useEffect(() => {
		const last = lastRef.current;
		lastRef.current = { type, count };
		if (last.type !== type || count >= last.count) return;
		// Undo (see useLastRemoved) is only offered for a single unsave, not Clear.
		const undo = last.count - count === 1 ? " Undo is above the list." : "";
		setMessage(
			count === 0
				? `Removed from Saved. Nothing saved here now.${undo}`
				: `Removed from Saved. ${count} left.${undo}`,
		);
		requestAnimationFrame(() => {
			if (!focusIsLost()) return;
			const rows = document.getElementById("saved-list")?.children;
			if (rows?.length) {
				focusFirstIn(rows[Math.min(focusedRowRef.current, rows.length - 1)]);
			} else {
				focusFirstIn(document.querySelector('[role="tabpanel"]:not([hidden])'));
			}
		});
	}, [type, count]);
	return message;
}

type Removed =
	| { kind: "story"; key: string; item: HackerNewsStoryRecord }
	| { kind: "paper"; key: string; item: SavedPaper };

/** The item most recently unsaved one at a time (not by Clear), for Undo. */
function useLastRemoved(
	stories: HackerNewsStoryRecord[],
	papers: SavedPaper[],
): Removed | null {
	const [removed, setRemoved] = useState<Removed | null>(null);
	const previousRef = useRef({ stories, papers });
	useEffect(() => {
		const previous = previousRef.current;
		previousRef.current = { stories, papers };
		if (stories.length === previous.stories.length - 1) {
			const ids = new Set(stories.map((story) => story.id));
			const item = previous.stories.find((story) => !ids.has(story.id));
			if (item)
				setRemoved({
					kind: "story",
					key: `story:${item.id}:${Date.now()}`,
					item,
				});
		} else if (papers.length === previous.papers.length - 1) {
			const ids = new Set(papers.map((paper) => paper.arxivId));
			const item = previous.papers.find((paper) => !ids.has(paper.arxivId));
			if (item)
				setRemoved({
					kind: "paper",
					key: `paper:${item.arxivId}:${Date.now()}`,
					item,
				});
		}
	}, [stories, papers]);
	return removed;
}
