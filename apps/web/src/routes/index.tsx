import { logger } from "@hackerfeed/runtime/logger";
import { createFileRoute } from "@tanstack/react-router";
import { FeedPage } from "#/components/pages/FeedPage";
import { HackerNewsFeedKey, prefetchFeed } from "#/lib/hacker-news/queries";
import { titleHead } from "#/lib/page-title";

export const Route = createFileRoute("/")({
	head: () => titleHead("Stories"),
	codeSplitGroupings: [["component", "pendingComponent"]],
	component: FeedPage,
	pendingComponent: FeedPage,
	loader: async ({ context }) => {
		try {
			await prefetchFeed(context.queryClient, HackerNewsFeedKey.Top);
		} catch (err) {
			logger.warn("Feed loader failed", {
				feed: HackerNewsFeedKey.Top,
				error: err,
			});
			throw err;
		}
	},
});
