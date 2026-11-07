import { ChatMarkdown } from "./ChatMarkdown";

/** One message in a chat transcript; your own questions sit on the right in a tinted bubble. */
export function ChatMessage({
	author,
	authorName,
	content,
	isStreaming = false,
}: {
	author: "user" | "assistant";
	/** Name read out to screen readers for assistant messages. */
	authorName: string;
	content: string;
	/** The assistant is still writing this message. */
	isStreaming?: boolean;
}) {
	const isUser = author === "user";
	return (
		<li
			aria-busy={isStreaming || undefined}
			className={`flex ${isUser ? "justify-end" : "justify-start"}`}
		>
			<div
				className={
					isUser
						? "min-w-0 max-w-[85%] whitespace-pre-wrap break-words rounded-xl rounded-br-sm bg-(--lagoon-tint) px-3.5 py-2 text-read text-(--sea-ink)"
						: "min-w-0 max-w-[68ch] break-words border-l-2 border-(--lagoon) py-0.5 pl-4 text-read text-(--sea-ink)"
				}
			>
				<span className="sr-only">{isUser ? "You: " : `${authorName}: `}</span>
				{isUser ? content : <ChatMarkdown text={content} />}
			</div>
		</li>
	);
}
