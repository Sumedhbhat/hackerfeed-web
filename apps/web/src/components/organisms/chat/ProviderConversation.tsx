import {
	type AiProviderStatus,
	MAX_CHAT_MESSAGE_LENGTH,
} from "@hackerfeed/contracts/ai";
import { Button } from "@hackerfeed/ui/atoms/Button";
import { Card } from "@hackerfeed/ui/atoms/Card";
import { TextLink } from "@hackerfeed/ui/atoms/Link";
import { Row } from "@hackerfeed/ui/atoms/Row";
import { Stack } from "@hackerfeed/ui/atoms/Stack";
import { Text } from "@hackerfeed/ui/atoms/Text";
import { CardSkeleton } from "@hackerfeed/ui/molecules/CardSkeleton";
import { ChatComposer } from "@hackerfeed/ui/molecules/ChatComposer";
import { ChatMessage } from "@hackerfeed/ui/molecules/ChatMessage";
import { IconText } from "@hackerfeed/ui/molecules/IconText";
import { InlineNotice } from "@hackerfeed/ui/molecules/InlineNotice";
import { NoticeCard } from "@hackerfeed/ui/molecules/NoticeCard";
import { SelectField } from "@hackerfeed/ui/molecules/SelectField";
import { MessageCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAiModels, useStoryChat } from "#/hooks/useAiProviders";

export const STARTER_PROMPTS = [
	"Summarize this article in a few bullet points.",
	"Why does this matter, and who is it useful for?",
	"What are the main points of debate in the HN comments?",
];

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

	// Keep the newest text and the composer in view while a reply streams, but
	// only while the reader is at the bottom: scrolling up to reread stops it.
	const followRef = useRef(true);
	const lastCountRef = useRef(messageCount);
	// Sending a question always scrolls to it; a reply finishing does not.
	useEffect(() => {
		const onScroll = () => {
			followRef.current =
				window.innerHeight + window.scrollY >=
				document.documentElement.scrollHeight - 160;
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
							label="Model"
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
						<Button variant="secondary" onClick={chat.reset}>
							New chat
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
											onClick={() => chat.send(prompt)}
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
