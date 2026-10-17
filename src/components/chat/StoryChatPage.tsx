import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	ArrowRight,
	MessageCircle,
	Send,
	Square,
} from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Button, buttonClassName } from "#/components/atoms/Button";
import {
	useAiModels,
	useAiProviders,
	useStoryChat,
} from "#/hooks/useAiProviders";
import { signIn } from "#/hooks/useAuthSession";
import {
	type AiProviderStatus,
	MAX_CHAT_MESSAGE_LENGTH,
} from "#/lib/ai/schemas";
import {
	type HackerNewsStoryRecord,
	storyQueryOptions,
} from "#/lib/hacker-news/queries";
import {
	buildChatGptStoryDiscussionUrl,
	getStoryTitle,
} from "#/lib/hacker-news/utils";

export const STARTER_PROMPTS = [
	"Summarize this article in a few bullet points.",
	"Why does this matter, and who is it useful for?",
	"What are the main points of debate in the HN comments?",
];

const panelClassName =
	"island-shell rounded-lg p-5 sm:p-6 text-sm leading-6 text-(--sea-ink-soft)";

type StoryChatPageProps = { storyId: number };

export function StoryChatPage({ storyId }: StoryChatPageProps) {
	const {
		data: story,
		isPending,
		isError,
	} = useQuery(storyQueryOptions(storyId));

	return (
		<main className="page-wrap px-4 pt-6 pb-16 sm:pt-10">
			<Link
				to="/story/$storyId"
				params={{ storyId }}
				className="inline-block mb-6 text-sm text-(--sea-ink-soft) hover:text-(--sea-ink) transition-colors"
			>
				<ArrowLeft size={14} aria-hidden="true" /> Story
			</Link>

			{isPending ? (
				<div className="island-shell rounded-lg p-6 animate-pulse">
					<div className="h-6 w-3/4 rounded bg-(--sand) opacity-50" />
				</div>
			) : isError || !story ? (
				<section className={panelClassName}>
					<h1 className="m-0 text-xl font-semibold text-(--sea-ink)">
						Story unavailable.
					</h1>
					<p className="m-0 mt-2">This story couldn't be loaded.</p>
				</section>
			) : (
				<StoryChat story={story} />
			)}
		</main>
	);
}

function StoryChat({ story }: { story: HackerNewsStoryRecord }) {
	const title = getStoryTitle(story);
	const status = useAiProviders();
	const connectedProviders =
		status.data?.filter((provider) => provider.connected) ?? [];

	return (
		<>
			<header className="mb-6">
				<p className="island-kicker mb-2">Discuss with AI</p>
				<h1 className="m-0 text-xl sm:text-2xl font-semibold leading-snug text-(--sea-ink)">
					{title}
				</h1>
				{story.url ? (
					<a
						href={story.url}
						target="_blank"
						rel="noopener noreferrer"
						className="mt-2 inline-block text-sm font-medium text-(--lagoon-deep) hover:text-(--lagoon) hover:underline underline-offset-2"
					>
						Read article{" "}
						<ArrowRight
							size={14}
							aria-hidden="true"
							className="inline opacity-60"
						/>
					</a>
				) : null}
			</header>

			{status.isLoading ? (
				<div className="island-shell rounded-lg p-6 animate-pulse">
					<div className="h-4 w-1/2 rounded bg-(--sand) opacity-50" />
				</div>
			) : !status.isSignedIn ? (
				<section className={panelClassName}>
					<p className="m-0">
						Sign in to HackerFeed, then connect an AI assistant from your
						profile to discuss this story here.
					</p>
					<div className="mt-4">
						<Button onClick={() => signIn(`/chat/${story.id}`)}>Sign in</Button>
					</div>
				</section>
			) : status.isError || !status.data ? (
				<section className={panelClassName}>
					<p className="m-0">Couldn't check your AI connections.</p>
					<div className="mt-4">
						<Button variant="secondary" onClick={() => void status.refetch()}>
							Retry
						</Button>
					</div>
				</section>
			) : connectedProviders.length === 0 ? (
				<section className={panelClassName}>
					<p className="m-0">
						Connect an AI assistant you already use from your profile to chat
						about this story without leaving HackerFeed.
					</p>
					<div className="mt-4 flex flex-wrap gap-3">
						<Link to="/profile" className={buttonClassName("primary")}>
							Connect an AI app in profile
						</Link>
						<a
							href={buildChatGptStoryDiscussionUrl(story)}
							target="_blank"
							rel="noopener noreferrer"
							className={buttonClassName("secondary")}
						>
							Open in ChatGPT instead
						</a>
					</div>
				</section>
			) : (
				<ChatConversation storyId={story.id} providers={connectedProviders} />
			)}
		</>
	);
}

/** Picks one of the user's connected providers; switching starts a new chat. */
function ChatConversation({
	storyId,
	providers,
}: {
	storyId: number;
	providers: AiProviderStatus[];
}) {
	const [selectedId, setSelectedId] = useState<string>();
	const provider =
		providers.find((candidate) => candidate.id === selectedId) ?? providers[0];

	return (
		<ProviderConversation
			key={provider.id}
			storyId={storyId}
			provider={provider}
			providers={providers}
			onProviderChange={setSelectedId}
		/>
	);
}

function ProviderConversation({
	storyId,
	provider,
	providers,
	onProviderChange,
}: {
	storyId: number;
	provider: AiProviderStatus;
	providers: AiProviderStatus[];
	onProviderChange: (providerId: string) => void;
}) {
	const models = useAiModels(provider.id);
	const [selectedModel, setSelectedModel] = useState<string>();
	const model = selectedModel ?? models.data?.[0]?.slug;
	const chat = useStoryChat(storyId, provider.id, model);
	const [draft, setDraft] = useState("");
	const endRef = useRef<HTMLDivElement>(null);
	const messageCount = chat.messages.length;
	const streamingLength = chat.streamingText?.length ?? 0;

	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll as content grows
	useEffect(() => {
		endRef.current?.scrollIntoView?.({ block: "end" });
	}, [messageCount, streamingLength]);

	if (models.isPending) {
		return (
			<div className="island-shell rounded-lg p-6 animate-pulse">
				<div className="h-4 w-1/3 rounded bg-(--sand) opacity-50" />
			</div>
		);
	}

	if (models.isError || !model) {
		return (
			<section className={panelClassName} role="alert">
				<p className="m-0">
					{models.error?.message ??
						`No ${provider.name} models are available for your account.`}
				</p>
				<div className="mt-4">
					<Button variant="secondary" onClick={() => void models.refetch()}>
						Retry
					</Button>
				</div>
			</section>
		);
	}

	const submit = (event?: FormEvent) => {
		event?.preventDefault();
		if (!draft.trim() || chat.isStreaming) return;
		chat.send(draft);
		setDraft("");
	};

	return (
		<section aria-label="Chat" className="island-shell rounded-lg p-4 sm:p-6">
			<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
				<div className="flex flex-wrap items-center gap-3">
					{providers.length > 1 ? (
						<label className="flex items-center gap-2 text-sm text-(--sea-ink-soft)">
							Assistant
							<select
								value={provider.id}
								onChange={(event) => onProviderChange(event.target.value)}
								disabled={chat.isStreaming}
								className="rounded-md border border-(--chip-line) bg-(--surface-strong) px-2 py-1 text-sm text-(--sea-ink)"
							>
								{providers.map((option) => (
									<option key={option.id} value={option.id}>
										{option.name}
									</option>
								))}
							</select>
						</label>
					) : (
						<span className="text-sm font-semibold text-(--sea-ink)">
							{provider.name}
						</span>
					)}
					<label className="flex items-center gap-2 text-sm text-(--sea-ink-soft)">
						Model
						<select
							value={model}
							onChange={(event) => setSelectedModel(event.target.value)}
							disabled={chat.isStreaming}
							className="rounded-md border border-(--chip-line) bg-(--surface-strong) px-2 py-1 text-sm text-(--sea-ink)"
						>
							{models.data.map((option) => (
								<option key={option.slug} value={option.slug}>
									{option.displayName}
								</option>
							))}
						</select>
					</label>
				</div>
				{messageCount > 0 ? (
					<Button variant="secondary" onClick={chat.reset}>
						New chat
					</Button>
				) : null}
			</div>

			<ol aria-label="Messages" className="m-0 list-none space-y-4 p-0">
				{chat.messages.map((message, index) => (
					<ChatBubble
						// biome-ignore lint/suspicious/noArrayIndexKey: messages are append-only
						key={index}
						author={message.role}
						assistantName={provider.name}
						content={message.content}
					/>
				))}
				{chat.streamingText !== null ? (
					<ChatBubble
						author="assistant"
						assistantName={provider.name}
						content={chat.streamingText || "Thinking…"}
						isStreaming
					/>
				) : null}
			</ol>

			{messageCount === 0 && !chat.isStreaming ? (
				<div className="flex flex-col items-start gap-2">
					<p className="m-0 flex items-center gap-2 text-sm text-(--sea-ink-soft)">
						<MessageCircle size={15} aria-hidden="true" /> Ask anything about
						this story, or start with:
					</p>
					{STARTER_PROMPTS.map((prompt) => (
						<Button
							key={prompt}
							variant="secondary"
							onClick={() => chat.send(prompt)}
						>
							{prompt}
						</Button>
					))}
				</div>
			) : null}

			{chat.error ? (
				<div
					role="alert"
					className="mt-4 flex flex-wrap items-center gap-3 rounded-md border border-(--chip-line) p-3 text-sm text-(--sea-ink)"
				>
					<span>{chat.error.message}</span>
					{chat.error.code === "provider_not_connected" ? (
						<Link
							to="/profile"
							className="text-(--lagoon-deep) hover:underline"
						>
							Reconnect in profile
						</Link>
					) : chat.messages.at(-1)?.role === "user" ? (
						<Button variant="ghost" onClick={chat.retry}>
							Try again
						</Button>
					) : null}
				</div>
			) : null}

			<div ref={endRef} />

			<form onSubmit={submit} className="mt-4 flex items-end gap-2">
				<label htmlFor="story-chat-input" className="sr-only">
					Message
				</label>
				<textarea
					id="story-chat-input"
					value={draft}
					onChange={(event) => setDraft(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter" && !event.shiftKey) submit(event);
					}}
					maxLength={MAX_CHAT_MESSAGE_LENGTH}
					rows={2}
					placeholder="Ask a question about this story…"
					className="min-h-11 flex-1 resize-y rounded-md border border-(--chip-line) bg-(--surface-strong) px-3 py-2 text-sm text-(--sea-ink) focus-visible:outline-2 focus-visible:outline-(--lagoon)"
				/>
				{chat.isStreaming ? (
					<Button variant="secondary" onClick={chat.stop}>
						<Square size={14} aria-hidden="true" /> Stop
					</Button>
				) : (
					<Button type="submit" disabled={!draft.trim()}>
						<Send size={14} aria-hidden="true" /> Send
					</Button>
				)}
			</form>
		</section>
	);
}

function ChatBubble({
	author,
	assistantName,
	content,
	isStreaming = false,
}: {
	author: "user" | "assistant";
	assistantName: string;
	content: string;
	isStreaming?: boolean;
}) {
	const isUser = author === "user";
	return (
		<li
			aria-busy={isStreaming || undefined}
			className={`flex ${isUser ? "justify-end" : "justify-start"}`}
		>
			<div
				className={`max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm leading-6 ${
					isUser
						? "bg-(--lagoon) text-white"
						: "border border-(--line) bg-(--surface-strong) text-(--sea-ink)"
				}`}
			>
				<span className="sr-only">
					{isUser ? "You: " : `${assistantName}: `}
				</span>
				{content}
			</div>
		</li>
	);
}
