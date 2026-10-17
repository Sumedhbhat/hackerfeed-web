import { createFileRoute, Navigate } from "@tanstack/react-router";
import { StoryChatPage } from "#/components/chat/StoryChatPage";
import { useFeatureFlag } from "#/hooks/useFeatureFlags";

export const Route = createFileRoute("/chat/$storyId")({
	params: {
		parse: (raw) => ({ storyId: Number(raw.storyId) }),
		stringify: (params) => ({ storyId: String(params.storyId) }),
	},
	component: ChatRoute,
});

function ChatRoute() {
	const { storyId } = Route.useParams();
	const aiChat = useFeatureFlag("aiChat");
	// Old links land on the story's comments while AI chat is off.
	if (!aiChat) {
		return <Navigate to="/story/$storyId" params={{ storyId }} replace />;
	}
	return <StoryChatPage storyId={storyId} />;
}
