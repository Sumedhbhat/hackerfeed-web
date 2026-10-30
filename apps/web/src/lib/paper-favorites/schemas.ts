import { z } from "zod";
import { arxivIdSchema, paperPresentationSchema } from "#/lib/papers/schemas";

export const paperFavoriteInputSchema = z
	.object({
		arxivId: arxivIdSchema,
	})
	.strict();

export const paperFavoritesListInputSchema = z
	.object({
		cursor: z.string().min(1).max(512).optional(),
		limit: z.number().int().min(1).max(50).default(20),
	})
	.strict();

export const savedPaperSchema = paperPresentationSchema.extend({
	savedAt: z.string(),
});

export const paperFavoritesListOutputSchema = z.object({
	items: z.array(savedPaperSchema),
	nextCursor: z.string().nullable(),
});

export type PaperFavoriteInput = z.infer<typeof paperFavoriteInputSchema>;
export type PaperFavoritesListInput = z.infer<
	typeof paperFavoritesListInputSchema
>;
export type PaperFavoritesListOutput = z.infer<
	typeof paperFavoritesListOutputSchema
>;
export type SavedPaper = z.infer<typeof savedPaperSchema>;
