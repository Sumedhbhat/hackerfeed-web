import type { HackerNewsStoryRecord } from "@hackerfeed/entities/hacker-news";
import type {
	PaperViewAction,
	StoryViewAction,
} from "@hackerfeed/entities/view-activity";
import { useQueryClient } from "@tanstack/react-query";
import { createTrpcClient } from "#/lib/trpc/client";
import { useAuthSession } from "./useAuthSession";
import { markFavoriteViewed } from "./useFavorites";
import { READING_DAYS_KEY } from "./useReadingDays";
import { STORIES_LAST_VIEWED_KEY } from "./useStoriesLastViewed";

export function useViewActivity() {
	const { user } = useAuthSession();
	const queryClient = useQueryClient();

	const refreshReadingDays = () =>
		queryClient.invalidateQueries({
			queryKey: [...READING_DAYS_KEY, user?.id],
		});

	return {
		recordStoryView(story: HackerNewsStoryRecord, action: StoryViewAction) {
			if (!user) return;
			void createTrpcClient()
				.views.story.mutate({ action, story })
				.then(async () => {
					if (action !== "chat_opened") {
						markFavoriteViewed(story.id, new Date());
						await refreshReadingDays();
					}
					await queryClient.invalidateQueries({
						queryKey: STORIES_LAST_VIEWED_KEY,
					});
				})
				.catch(() => undefined);
		},

		recordPaperView(arxivId: string, action: PaperViewAction) {
			if (!user) return;
			void createTrpcClient()
				.views.paper.mutate({ action, arxivId })
				.then(() => {
					if (action === "read") return refreshReadingDays();
				})
				.catch(() => undefined);
		},
	};
}
