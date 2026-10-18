/** One message in a chat transcript; the user's own messages sit on the right. */
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
				className={`max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm leading-6 ${
					isUser
						? "bg-(--lagoon) text-white"
						: "border border-(--line) bg-(--surface-strong) text-(--sea-ink)"
				}`}
			>
				<span className="sr-only">{isUser ? "You: " : `${authorName}: `}</span>
				{content}
			</div>
		</li>
	);
}
