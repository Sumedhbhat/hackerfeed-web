import { z } from "zod";

export const hackerNewsStorySchema = z.object({
	by: z.string().nullable(),
	descendants: z.number().int().nonnegative(),
	id: z.number().int().positive(),
	kids: z.array(z.number().int().positive()),
	score: z.number().int(),
	text: z.string().nullable(),
	time: z.number().int().nullable(),
	title: z.string().nullable(),
	type: z.literal("story"),
	url: z.string().nullable(),
});

export const favoriteStoryIdInputSchema = z.object({
	hnStoryId: z.number().int().positive(),
});

export const importLocalFavoritesInputSchema = z.object({
	stories: z.array(hackerNewsStorySchema),
});

export const favoriteStoriesOutputSchema = z.array(hackerNewsStorySchema);

export type FavoriteStoryInput = z.infer<typeof hackerNewsStorySchema>;
