import type { HackerNewsStoryRecord } from "@hackerfeed/hacker-news/records";
import {
	buildChatGptStoryDiscussionUrl,
	getStoryTitle,
} from "@hackerfeed/hacker-news/utils";
import {
	Button,
	ButtonLink,
	ExternalButtonLink,
} from "@hackerfeed/ui/atoms/Button";
import { CardSkeleton } from "@hackerfeed/ui/molecules/CardSkeleton";
import { NoticeCard } from "@hackerfeed/ui/molecules/NoticeCard";
import { StoryChatHeader } from "@hackerfeed/ui/molecules/StoryChatHeader";
import { ChatConversation } from "#/components/organisms/chat/ChatConversation";
import { useAiProviders } from "#/hooks/useAiProviders";
import { signIn } from "#/hooks/useAuthSession";

/** Story header plus the chat, or what the user needs to do before chatting. */
export function StoryChat({ story }: { story: HackerNewsStoryRecord }) {
	const status = useAiProviders();
	const connectedProviders =
		status.data?.filter((provider) => provider.connected) ?? [];

	return (
		<>
			<StoryChatHeader title={getStoryTitle(story)} url={story.url} />

			{status.isLoading ? (
				<CardSkeleton width="50%" />
			) : !status.isSignedIn ? (
				<NoticeCard
					message="Sign in to HackerFeed, then connect an AI assistant from your profile to discuss this story here."
					actions={
						<Button onClick={() => signIn(`/chat/${story.id}`)}>Sign in</Button>
					}
				/>
			) : status.isError || !status.data ? (
				<NoticeCard
					message="Couldn't check your AI connections."
					actions={
						<Button variant="secondary" onClick={() => void status.refetch()}>
							Retry
						</Button>
					}
				/>
			) : connectedProviders.length === 0 ? (
				<NoticeCard
					message="Connect an AI assistant you already use from your profile to chat about this story without leaving HackerFeed."
					actions={
						<>
							<ButtonLink to="/profile">
								Connect an AI app in profile
							</ButtonLink>
							<ExternalButtonLink
								href={buildChatGptStoryDiscussionUrl(story)}
								variant="secondary"
							>
								Open in ChatGPT instead
							</ExternalButtonLink>
						</>
					}
				/>
			) : (
				<ChatConversation storyId={story.id} providers={connectedProviders} />
			)}
		</>
	);
}
