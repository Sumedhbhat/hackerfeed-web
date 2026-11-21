import { z } from "zod";
import { hackerNewsStorySchema } from "./favorites";
import { arxivIdSchema } from "./papers";

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

export const storiesLastViewedInputSchema = z
	.object({
		hnStoryIds: z.array(z.number().int().positive()).max(50),
	})
	.strict();

export const storiesLastViewedOutputSchema = z.array(
	z.object({
		hnStoryId: z.number().int().positive(),
		lastViewedAt: z.date(),
	}),
);
export type StoryLastViewed = z.infer<
	typeof storiesLastViewedOutputSchema
>[number];

export const paperViewInputSchema = z
	.object({
		action: paperViewActionSchema,
		arxivId: arxivIdSchema,
	})
	.strict();
