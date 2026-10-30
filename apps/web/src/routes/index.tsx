import { logger } from "@hackerfeed/runtime/logger";
import { createFileRoute } from "@tanstack/react-router";
import { FeedPage } from "#/components/pages/FeedPage";
import {
	feedStoryIdsQueryOptions,
	HackerNewsFeedKey,
	PAGE_SIZE,
	storyQueryOptions,
} from "#/lib/hacker-news/queries";

export const Route = createFileRoute("/")({
	component: FeedPage,
	loader: async ({ context }) => {
		try {
			const ids = await context.queryClient.ensureQueryData(
				feedStoryIdsQueryOptions(HackerNewsFeedKey.Top),
			);
			await Promise.all(
				ids
					.slice(0, PAGE_SIZE)
					.map((id) =>
						context.queryClient.ensureQueryData(storyQueryOptions(id)),
					),
			);
		} catch (err) {
			logger.warn("Feed loader failed", {
				feed: HackerNewsFeedKey.Top,
				error: err,
			});
			throw err;
		}
	},
});
