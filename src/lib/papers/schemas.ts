import { z } from "zod";

const editionDateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date");

export const paperEditionInputSchema = z.object({
	editionDate: editionDateSchema.optional(),
});

const paperSchema = z.object({
	abstract: z.string().nullable(),
	arxivId: z.string(),
	authors: z.array(z.string()),
	entryPublishedAt: z.string(),
	githubRepo: z.string().nullable(),
	keywords: z.array(z.string()),
	paperPublishedAt: z.string(),
	paperUrl: z.string(),
	projectPage: z.string().nullable(),
	rank: z.number().int().positive(),
	summary: z.string(),
	title: z.string(),
	upvotes: z.number().int().nonnegative(),
});

const popularKeywordSchema = z.object({
	keyword: z.string(),
	paperCount: z.number().int().positive(),
	totalUpvotes: z.number().int().nonnegative(),
});

export const paperEditionOutputSchema = z.object({
	editionDate: editionDateSchema.nullable(),
	papers: z.array(paperSchema),
	popularKeywords: z.array(popularKeywordSchema),
});

export type PaperEdition = z.infer<typeof paperEditionOutputSchema>;
export type PaperEditionInput = z.infer<typeof paperEditionInputSchema>;
export type PaperFeedPaper = z.infer<typeof paperSchema>;
export type PopularPaperKeyword = z.infer<typeof popularKeywordSchema>;
