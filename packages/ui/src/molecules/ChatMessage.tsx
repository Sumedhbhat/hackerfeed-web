import { ChatMarkdown } from "./ChatMarkdown";

export function ChatMessage({
	author,
	authorName,
	content,
	isStreaming = false,
	incomplete = false,
}: {
	author: "user" | "assistant";
	/** Name read out to screen readers for assistant messages. */
	authorName: string;
	content: string;
	/** The assistant is still writing this message. */
	isStreaming?: boolean;
	incomplete?: boolean;
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
						? "min-w-0 max-w-[85%] whitespace-pre-wrap break-words rounded-xl rounded-br-sm bg-accent-tint px-3.5 py-2 text-read text-ink"
						: "min-w-0 max-w-[68ch] break-words border-l-2 border-accent py-0.5 pl-4 text-read text-ink"
				}
			>
				<span className="sr-only">{isUser ? "You: " : `${authorName}: `}</span>
				{isUser ? content : <ChatMarkdown text={content} />}
				{incomplete ? (
					<p className="mt-2 mb-0 text-meta text-ink-faint italic">
						Reply cut off.
					</p>
				) : null}
			</div>
		</li>
	);
}
