import { z } from "zod";

export const MAX_CHAT_MESSAGES = 40;
export const MAX_CHAT_MESSAGE_LENGTH = 8_000;

export const aiProviderIdSchema = z
	.string()
	.regex(/^[a-z0-9-]{1,40}$/, "Invalid provider id");

export const chatMessageSchema = z.object({
	role: z.enum(["user", "assistant"]),
	content: z.string().trim().min(1).max(MAX_CHAT_MESSAGE_LENGTH),
});

export const storyChatRequestSchema = z.object({
	providerId: aiProviderIdSchema,
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

/** One JSON object per line in the /api/ai/chat response body. */
export type ChatStreamEvent =
	| { type: "delta"; text: string }
	| { type: "done" }
	| { type: "error"; code: string; message: string; retryable: boolean };

/** An entry from the `ai_providers` catalog with the user's connection state. */
export type AiProviderStatus = {
	id: string;
	name: string;
	description: string;
	manageUrl: string | null;
	/** Sign-in can start on this deployment. */
	canConnect: boolean;
	connected: boolean;
	account: { email: string | null; name: string | null } | null;
};

export type AiModel = { slug: string; displayName: string };

export type AiApiError = {
	code: string;
	message: string;
	retryable?: boolean;
};
