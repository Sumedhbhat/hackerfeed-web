import type { HackerNewsStoryRecord } from "@hackerfeed/entities/hacker-news";
import type {
	PaperViewAction,
	StoryViewAction,
} from "@hackerfeed/entities/view-activity";
import { createTrpcClient } from "#/lib/trpc/client";
import { useAuthSession } from "./useAuthSession";

export function useViewActivity() {
	const { user } = useAuthSession();

	return {
		recordStoryView(story: HackerNewsStoryRecord, action: StoryViewAction) {
			if (!user) return;
			void createTrpcClient()
				.views.story.mutate({ action, story })
				.catch(() => undefined);
		},

		recordPaperView(arxivId: string, action: PaperViewAction) {
			if (!user) return;
			void createTrpcClient()
				.views.paper.mutate({ action, arxivId })
				.catch(() => undefined);
		},
	};
}
