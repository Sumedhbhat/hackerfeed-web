import { z } from "zod";

const editionDateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date");

export const arxivIdSchema = z
	.string()
	.trim()
	.max(100)
	.regex(
		/^(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[a-z-]+)*\/\d{7})(?:v\d+)?$/i,
		"Expected a valid arXiv ID",
	);

const httpsUrlSchema = z
	.string()
	.url()
	.refine(
		(value) => new URL(value).protocol === "https:",
		"Expected an HTTPS URL",
	);

export const paperEditionInputSchema = z.object({
	editionDate: editionDateSchema.optional(),
});

export const paperPresentationSchema = z.object({
	abstract: z.string().nullable(),
	arxivId: arxivIdSchema,
	authors: z.array(z.string()),
	githubRepo: httpsUrlSchema.nullable(),
	keywords: z.array(z.string()),
	paperPublishedAt: z.string(),
	paperUrl: httpsUrlSchema,
	projectPage: httpsUrlSchema.nullable(),
	summary: z.string(),
	title: z.string(),
	upvotes: z.number().int().nonnegative(),
});

export const editionPaperSchema = paperPresentationSchema.extend({
	entryPublishedAt: z.string(),
	rank: z.number().int().positive(),
});

const popularKeywordSchema = z.object({
	keyword: z.string(),
	paperCount: z.number().int().positive(),
	totalUpvotes: z.number().int().nonnegative(),
});

export const paperEditionOutputSchema = z.object({
	editionDate: editionDateSchema.nullable(),
	papers: z.array(editionPaperSchema),
	popularKeywords: z.array(popularKeywordSchema),
});

export type PaperEdition = z.infer<typeof paperEditionOutputSchema>;
export type PaperEditionInput = z.infer<typeof paperEditionInputSchema>;
export type PaperFeedPaper = z.infer<typeof editionPaperSchema>;
export type PopularPaperKeyword = z.infer<typeof popularKeywordSchema>;
