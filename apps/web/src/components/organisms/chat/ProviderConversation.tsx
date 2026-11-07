import {
	type AiProviderStatus,
	MAX_CHAT_MESSAGE_LENGTH,
} from "@hackerfeed/contracts/ai";
import { Button } from "@hackerfeed/ui/atoms/Button";
import { Card } from "@hackerfeed/ui/atoms/Card";
import { Icon } from "@hackerfeed/ui/atoms/Icon";
import { TextLink } from "@hackerfeed/ui/atoms/Link";
import { LiveStatus } from "@hackerfeed/ui/atoms/LiveStatus";
import { Row } from "@hackerfeed/ui/atoms/Row";
import { Stack } from "@hackerfeed/ui/atoms/Stack";
import { Text } from "@hackerfeed/ui/atoms/Text";
import { WideText } from "@hackerfeed/ui/atoms/WideText";
import { CardSkeleton } from "@hackerfeed/ui/molecules/CardSkeleton";
import { ChatComposer } from "@hackerfeed/ui/molecules/ChatComposer";
import { ChatMessage } from "@hackerfeed/ui/molecules/ChatMessage";
import { IconText } from "@hackerfeed/ui/molecules/IconText";
import { InlineNotice } from "@hackerfeed/ui/molecules/InlineNotice";
import { NoticeCard } from "@hackerfeed/ui/molecules/NoticeCard";
import { SelectField } from "@hackerfeed/ui/molecules/SelectField";
import { MessageCircle, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAiModels, useStoryChat } from "#/hooks/useAiProviders";

export const STARTER_PROMPTS = [
	"Summarize this article in a few bullet points.",
	"Why does this matter, and who is it useful for?",
	"What are the main points of debate in the HN comments?",
];

/** After an action removes the focused control, continue in the message box. */
function focusComposer() {
	requestAnimationFrame(() =>
		document.getElementById("story-chat-input")?.focus(),
	);
}

/** A chat with one provider: model picker, transcript, and message box. */
export function ProviderConversation({
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

	// Screen readers hear that a reply is coming and when it has arrived
	// (WCAG 4.1.3), not every streamed word.
	const [announcement, setAnnouncement] = useState("");
	const wasStreamingRef = useRef(false);
	useEffect(() => {
		if (chat.isStreaming && !wasStreamingRef.current) {
			setAnnouncement(`${provider.name} is replying…`);
		} else if (!chat.isStreaming && wasStreamingRef.current) {
			setAnnouncement(
				chat.messages.at(-1)?.role === "assistant"
					? `${provider.name} replied.`
					: "",
			);
			// Stop becomes Send when a reply ends; keep focus in the conversation.
			if (document.activeElement === document.body) focusComposer();
		}
		wasStreamingRef.current = chat.isStreaming;
	}, [chat.isStreaming, chat.messages, provider.name]);

	// Keep the newest text and the composer in view while a reply streams, but
	// only while the reader is at the bottom: scrolling up to reread stops it.
	const followRef = useRef(true);
	const lastCountRef = useRef(messageCount);
	// Sending a question always scrolls to it; a reply finishing does not.
	useEffect(() => {
		// Following stops only when the end of the chat (not the page, which has
		// a footer below) is more than a short way below the viewport.
		const onScroll = () => {
			const end = endRef.current?.getBoundingClientRect().top;
			if (end !== undefined)
				followRef.current = end <= window.innerHeight + 160;
		};
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll as content grows
	useEffect(() => {
		const asked =
			messageCount !== lastCountRef.current &&
			chat.messages.at(-1)?.role === "user";
		lastCountRef.current = messageCount;
		if (asked || followRef.current) {
			endRef.current?.scrollIntoView?.({ block: "end" });
		}
	}, [messageCount, streamingLength]);

	if (models.isPending) {
		return <CardSkeleton width="33%" />;
	}

	if (models.isError || !model) {
		return (
			<NoticeCard
				role="alert"
				message={
					models.error?.message ??
					`No ${provider.name} models are available for your account.`
				}
				actions={
					<Button variant="secondary" onClick={() => void models.refetch()}>
						Retry
					</Button>
				}
			/>
		);
	}

	const submit = () => {
		if (!draft.trim() || chat.isStreaming) return;
		chat.send(draft);
		setDraft("");
	};

	return (
		<Card as="section" aria-label="Chat" padding="sm">
			<LiveStatus message={announcement} />
			<Stack gap="lg">
				<Row justify="between" wrap>
					<Row wrap>
						{providers.length > 1 ? (
							<SelectField
								label="Assistant"
								value={provider.id}
								onChange={onProviderChange}
								disabled={chat.isStreaming}
								options={providers.map((option) => ({
									value: option.id,
									label: option.name,
								}))}
							/>
						) : (
							<Text as="span" weight="semibold">
								{provider.name}
							</Text>
						)}
						<SelectField
							// Named after the visible provider, so voice control can say
							// "ChatGPT model" (WCAG 2.5.3).
							label={`${provider.name} model`}
							hideLabel
							value={model}
							onChange={setSelectedModel}
							disabled={chat.isStreaming}
							options={models.data.map((option) => ({
								value: option.slug,
								label: option.displayName,
							}))}
						/>
					</Row>
					{messageCount > 0 ? (
						<Button
							variant="secondary"
							onClick={() => {
								chat.reset();
								setAnnouncement("Started a new chat.");
								// The button disappears; the Undo that replaces it gets focus.
								requestAnimationFrame(() =>
									document.getElementById("story-chat-undo")?.focus(),
								);
							}}
							aria-label="New chat"
							title="New chat"
						>
							<Icon icon={Plus} />
							<WideText from="xs">New chat</WideText>
						</Button>
					) : null}
				</Row>

				<div>
					<Stack gap="md">
						{messageCount > 0 || chat.streamingText !== null ? (
							<Stack as="ol" gap="lg" aria-label="Messages">
								{chat.messages.map((message, index) => (
									<ChatMessage
										// biome-ignore lint/suspicious/noArrayIndexKey: messages are append-only
										key={index}
										author={message.role}
										authorName={provider.name}
										content={message.content}
									/>
								))}
								{chat.streamingText !== null ? (
									<ChatMessage
										author="assistant"
										authorName={provider.name}
										content={chat.streamingText || "Thinking…"}
										isStreaming
									/>
								) : null}
							</Stack>
						) : null}

						{chat.canUndoReset && messageCount === 0 ? (
							<InlineNotice
								boxed
								message="Started a new chat."
								action={
									<Button
										id="story-chat-undo"
										variant="ghost"
										aria-label="Undo new chat"
										onClick={() => {
											chat.undoReset();
											setAnnouncement("Chat restored.");
											focusComposer();
										}}
									>
										Undo
									</Button>
								}
							/>
						) : null}

						{messageCount === 0 && !chat.isStreaming ? (
							<Stack gap="sm" align="start">
								<IconText icon={MessageCircle} tone="soft">
									Ask anything about this story, or start with:
								</IconText>
								<Row gap="sm" align="start" wrap stackOnMobile>
									{STARTER_PROMPTS.map((prompt) => (
										<Button
											key={prompt}
											variant="secondary"
											onClick={() => {
												chat.send(prompt);
												focusComposer();
											}}
										>
											{prompt}
										</Button>
									))}
								</Row>
							</Stack>
						) : null}

						{chat.error ? (
							<InlineNotice
								boxed
								role="alert"
								message={chat.error.message}
								action={
									chat.error.code === "provider_not_connected" ? (
										<TextLink to="/profile" variant="accent">
											Reconnect in profile
										</TextLink>
									) : chat.messages.at(-1)?.role === "user" ? (
										<Button variant="ghost" onClick={chat.retry}>
											Try again
										</Button>
									) : null
								}
							/>
						) : null}
					</Stack>
				</div>

				<ChatComposer
					id="story-chat-input"
					value={draft}
					onChange={setDraft}
					onSubmit={submit}
					onStop={chat.stop}
					isStreaming={chat.isStreaming}
					maxLength={MAX_CHAT_MESSAGE_LENGTH}
					placeholder="Ask about this story…"
				/>
			</Stack>
			{/* After the composer, so following the reply keeps the input in view;
			    outside the Stack so it adds no gap. */}
			<div ref={endRef} />
		</Card>
	);
}
