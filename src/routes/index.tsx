import { createFileRoute } from "@tanstack/react-router";
import { FeedApp } from "#/components/feed";
import {
	feedStoryIdsQueryOptions,
	HackerNewsFeedKey,
	PAGE_SIZE,
	storyQueryOptions,
} from "#/lib/hacker-news/queries";
import { logger } from "#/lib/logger";

export const Route = createFileRoute("/")({
	component: FeedApp,
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
			logger.error("Feed loader failed", {
				feed: HackerNewsFeedKey.Top,
				err: err instanceof Error ? err.message : String(err),
				stack: err instanceof Error ? err.stack : undefined,
			});
			throw err;
		}
	},
});
