import { z } from "zod";
import { hackerNewsStorySchema } from "#/lib/favorites/schemas";
import { arxivIdSchema } from "#/lib/papers/schemas";

export const storyViewActionSchema = z.enum([
	"read",
	"discussion_opened",
	"chat_opened",
]);
export type StoryViewAction = z.infer<typeof storyViewActionSchema>;

export const paperViewActionSchema = z.enum(["read", "chat_opened"]);
export type PaperViewAction = z.infer<typeof paperViewActionSchema>;

export const storyViewInputSchema = z
	.object({
		action: storyViewActionSchema,
		story: hackerNewsStorySchema,
	})
	.strict();

export const paperViewInputSchema = z
	.object({
		action: paperViewActionSchema,
		arxivId: arxivIdSchema,
	})
	.strict();
