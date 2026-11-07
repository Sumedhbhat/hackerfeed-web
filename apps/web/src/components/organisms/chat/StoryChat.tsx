import type { HackerNewsStoryRecord } from "@hackerfeed/hacker-news/records";
import {
	buildChatGptStoryDiscussionUrl,
	getStoryTitle,
	splitPostKind,
} from "@hackerfeed/hacker-news/utils";
import {
	Button,
	ButtonLink,
	ExternalButtonLink,
} from "@hackerfeed/ui/atoms/Button";
import { Icon } from "@hackerfeed/ui/atoms/Icon";
import { TitleTag } from "@hackerfeed/ui/atoms/TitleTag";
import { ToggleButton } from "@hackerfeed/ui/atoms/Toggle";
import { ToggleLabel } from "@hackerfeed/ui/atoms/ToggleLabel";
import { CardSkeleton } from "@hackerfeed/ui/molecules/CardSkeleton";
import { NoticeCard } from "@hackerfeed/ui/molecules/NoticeCard";
import { StoryChatHeader } from "@hackerfeed/ui/molecules/StoryChatHeader";
import { Bookmark, MessageSquare } from "lucide-react";
import { ChatConversation } from "#/components/organisms/chat/ChatConversation";
import { useAiProviders } from "#/hooks/useAiProviders";
import { signIn } from "#/hooks/useAuthSession";
import { useFavorites } from "#/hooks/useFavorites";

/** Story header plus the chat, or what the user needs to do before chatting. */
export function StoryChat({ story }: { story: HackerNewsStoryRecord }) {
	const status = useAiProviders();
	const connectedProviders =
		status.data?.filter((provider) => provider.connected) ?? [];

	return (
		<>
			<StoryChatHeader
				title={<StoryTitle title={getStoryTitle(story)} />}
				url={story.url}
				actions={<StoryChatActions story={story} />}
			/>

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

/** Save the story and jump to its HN comments without leaving the chat first. */
function StoryChatActions({ story }: { story: HackerNewsStoryRecord }) {
	const { isFavorited, toggleFavorite } = useFavorites();
	const saved = isFavorited(story.id);
	const comments = story.descendants ?? 0;
	return (
		<>
			<ButtonLink
				variant="ghost"
				to="/story/$storyId"
				params={{ storyId: story.id }}
			>
				<Icon icon={MessageSquare} />
				{comments} {comments === 1 ? "comment" : "comments"}
			</ButtonLink>
			<ToggleButton
				aria-label={`Save ${getStoryTitle(story)}`}
				pressed={saved}
				onPressedChange={() => toggleFavorite(story)}
			>
				<Icon icon={Bookmark} filled={saved} />
				<ToggleLabel on={saved} offLabel="Save" onLabel="Saved" />
			</ToggleButton>
		</>
	);
}

/** A story title with its Show HN / Ask HN prefix as a tag, as in the feed. */
function StoryTitle({ title }: { title: string }) {
	const { kind, text } = splitPostKind(title);
	return (
		<>
			{kind ? <TitleTag>{kind}</TitleTag> : null}
			{text}
		</>
	);
}
