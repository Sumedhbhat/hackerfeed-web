import { z } from "zod";

export const MAX_CHAT_MESSAGES = 40;
export const MAX_CHAT_MESSAGE_LENGTH = 8_000;

export const chatMessageSchema = z.object({
	role: z.enum(["user", "assistant"]),
	content: z.string().trim().min(1).max(MAX_CHAT_MESSAGE_LENGTH),
});

export const storyChatRequestSchema = z.object({
	storyId: z.number().int().positive(),
	model: z.string().trim().min(1).max(200),
	messages: z
		.array(chatMessageSchema)
		.min(1)
		.max(MAX_CHAT_MESSAGES)
		.refine((messages) => messages.at(-1)?.role === "user", {
			message: "The last message must come from the user",
		}),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type StoryChatRequest = z.infer<typeof storyChatRequestSchema>;

/** One JSON object per line in the /api/chatgpt/chat response body. */
export type ChatStreamEvent =
	| { type: "delta"; text: string }
	| { type: "done" }
	| { type: "error"; code: string; message: string; retryable: boolean };

export type ChatGptStatus = {
	canConnect: boolean;
	connected: boolean;
	email: string | null;
	name: string | null;
};

export type ChatGptModel = { slug: string; displayName: string };

export type ChatGptApiError = {
	code: string;
	message: string;
	retryable?: boolean;
};
