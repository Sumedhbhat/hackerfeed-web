import { logger } from "@hackerfeed/runtime/logger";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { StoryErrorPage } from "#/components/pages/StoryErrorPage";
import { StoryNotFoundPage } from "#/components/pages/StoryNotFoundPage";
import { StoryPage } from "#/components/pages/StoryPage";
import {
	commentQueryOptions,
	storyQueryOptions,
} from "#/lib/hacker-news/queries";

export const Route = createFileRoute("/story/$storyId")({
	params: {
		parse: (raw) => ({ storyId: Number(raw.storyId) }),
		stringify: (params) => ({ storyId: String(params.storyId) }),
	},
	loader: async ({ context, params }) => {
		const { storyId } = params;

		try {
			const story = await context.queryClient.ensureQueryData(
				storyQueryOptions(storyId),
			);

			if (!story) throw notFound();

			// Warm top-level comments in parallel; don't let one failure block the page
			await Promise.allSettled(
				story.kids.map((id) =>
					context.queryClient.ensureQueryData(commentQueryOptions(id)),
				),
			);

			return story;
		} catch (err) {
			// notFound() errors are expected — don't log them as errors
			const isNotFound =
				err != null &&
				typeof err === "object" &&
				"isNotFound" in err &&
				err.isNotFound === true;

			if (!isNotFound) {
				logger.warn("Story loader failed", { storyId, error: err });
			}

			throw err;
		}
	},
	component: StoryRoute,
	errorComponent: StoryErrorPage,
	notFoundComponent: StoryNotFoundPage,
});

function StoryRoute() {
	const { storyId } = Route.useParams();
	return <StoryPage storyId={storyId} />;
}
