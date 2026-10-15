import { createFileRoute } from "@tanstack/react-router";
import { StoryChatPage } from "#/components/chat/StoryChatPage";

export const Route = createFileRoute("/chat/$storyId")({
	params: {
		parse: (raw) => ({ storyId: Number(raw.storyId) }),
		stringify: (params) => ({ storyId: String(params.storyId) }),
	},
	component: ChatRoute,
});

function ChatRoute() {
	const { storyId } = Route.useParams();
	return <StoryChatPage storyId={storyId} />;
}
