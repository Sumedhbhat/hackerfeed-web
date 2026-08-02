import type { HackerNewsStoryRecord } from "#/lib/hacker-news/queries";
import { createTrpcClient } from "#/lib/trpc/client";
import { useAuthSession } from "./useAuthSession";

export function useViewActivity() {
	const { user } = useAuthSession();

	return {
		recordStoryView(story: HackerNewsStoryRecord) {
			if (!user) return;
			void createTrpcClient()
				.views.story.mutate(story)
				.catch(() => undefined);
		},

		recordPaperView(arxivId: string) {
			if (!user) return;
			void createTrpcClient()
				.views.paper.mutate({ arxivId })
				.catch(() => undefined);
		},
	};
}
