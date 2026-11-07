import { createFileRoute, Navigate } from "@tanstack/react-router";
import { StoryChatPage } from "#/components/pages/StoryChatPage";
import { useFeatureFlag } from "#/hooks/useFeatureFlags";
import { storyQueryOptions } from "#/lib/hacker-news/queries";
import { titleHead } from "#/lib/page-title";

export const Route = createFileRoute("/chat/$storyId")({
	params: {
		parse: (raw) => ({ storyId: Number(raw.storyId) }),
		stringify: (params) => ({ storyId: String(params.storyId) }),
	},
	// Only for the page title; the page shows its own loading and errors.
	loader: ({ context, params }) =>
		context.queryClient
			.ensureQueryData(storyQueryOptions(params.storyId))
			.catch(() => null),
	head: ({ loaderData }) =>
		titleHead(loaderData?.title ? `Ask AI: ${loaderData.title}` : "Ask AI"),
	component: ChatRoute,
});

function ChatRoute() {
	const { storyId } = Route.useParams();
	const aiChat = useFeatureFlag("aiChat");
	if (!aiChat) {
		return <Navigate to="/story/$storyId" params={{ storyId }} replace />;
	}
	return <StoryChatPage storyId={storyId} />;
}
