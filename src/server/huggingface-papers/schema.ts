import { z } from "zod";

export function normalizeKeyword(keyword: string): string {
	return keyword.trim().toLowerCase().replace(/\s+/g, " ");
}

const nullableString = z.string().nullish();
const dateTime = z.iso.datetime();

const organizationSchema = z.object({
	_id: z.string().min(1),
	fullname: nullableString,
	name: z.string().min(1),
});

const authorUserSchema = z.object({
	_id: z.string().min(1),
	avatarUrl: nullableString,
	fullname: nullableString,
	name: nullableString,
	user: nullableString,
});

const authorSchema = z.object({
	_id: z.string().min(1),
	hidden: z.boolean(),
	name: z.string().min(1),
	status: nullableString,
	statusLastChangedAt: dateTime.nullish(),
	user: authorUserSchema.nullish(),
});

const paperSchema = z.object({
	ai_keywords: z.array(z.string()).optional().default([]),
	ai_summary: nullableString,
	ai_summary_model: nullableString,
	authors: z.array(authorSchema),
	discussionId: z.string().min(1),
	githubRepo: nullableString,
	id: z.string().min(1),
	organization: organizationSchema.nullish(),
	projectPage: nullableString,
	publishedAt: dateTime,
	summary: z.string(),
	title: z.string().min(1),
	upvotes: z.number().int().nonnegative(),
	withdrawnAt: dateTime.nullish(),
});

const dailyPaperSchema = z.object({
	isAuthorParticipating: z.boolean(),
	organization: organizationSchema.nullish(),
	paper: paperSchema,
	publishedAt: dateTime,
	summary: z.string(),
	thumbnail: nullableString,
	title: z.string().min(1),
});

const dailyPapersResponseSchema = z.array(dailyPaperSchema).max(100);

export type HuggingFaceOrganization = {
	hfOrganizationId: string;
	name: string;
	fullname: string | null;
};

export type HuggingFacePaperAuthor = {
	hfAuthorId: string;
	name: string;
	hidden: boolean;
	status: string | null;
	statusLastChangedAt: string | null;
	hfUserId: string | null;
	hfUsername: string | null;
	hfFullname: string | null;
	avatarUrl: string | null;
	position: number;
};

export type HuggingFacePaperKeyword = {
	keywordOriginal: string;
	keywordNormalized: string;
	position: number;
};

export type HuggingFaceDailyPaper = {
	rank: number;
	entryPublishedAt: string;
	isAuthorParticipating: boolean;
	paper: {
		arxivId: string;
		title: string;
		summary: string;
		aiSummary: string | null;
		aiSummaryModel: string | null;
		paperPublishedAt: string;
		upvotes: number;
		discussionId: string;
		projectPage: string | null;
		githubRepo: string | null;
		thumbnailUrl: string | null;
		withdrawnAt: string | null;
		organization: HuggingFaceOrganization | null;
		authors: HuggingFacePaperAuthor[];
		keywords: HuggingFacePaperKeyword[];
	};
};

function nullable(value: string | null | undefined): string | null {
	return value ?? null;
}

export function validateHuggingFaceDailyPapersResponse(
	payload: unknown,
): HuggingFaceDailyPaper[] {
	const entries = dailyPapersResponseSchema.parse(payload);

	return entries.map((entry, index) => {
		const paper = entry.paper;
		const organization = paper.organization ?? entry.organization;

		return {
			entryPublishedAt: entry.publishedAt,
			isAuthorParticipating: entry.isAuthorParticipating,
			paper: {
				aiSummary: nullable(paper.ai_summary),
				aiSummaryModel: nullable(paper.ai_summary_model),
				arxivId: paper.id,
				authors: paper.authors.map((author, authorIndex) => ({
					avatarUrl: nullable(author.user?.avatarUrl),
					hfAuthorId: author._id,
					hfFullname: nullable(author.user?.fullname),
					hfUserId: nullable(author.user?._id),
					hfUsername: nullable(author.user?.user ?? author.user?.name),
					hidden: author.hidden,
					name: author.name,
					position: authorIndex + 1,
					status: nullable(author.status),
					statusLastChangedAt: nullable(author.statusLastChangedAt),
				})),
				discussionId: paper.discussionId,
				githubRepo: nullable(paper.githubRepo),
				keywords: paper.ai_keywords.map((keyword, keywordIndex) => ({
					keywordNormalized: normalizeKeyword(keyword),
					keywordOriginal: keyword,
					position: keywordIndex + 1,
				})),
				organization: organization
					? {
							fullname: nullable(organization.fullname),
							hfOrganizationId: organization._id,
							name: organization.name,
						}
					: null,
				paperPublishedAt: paper.publishedAt,
				projectPage: nullable(paper.projectPage),
				summary: paper.summary,
				thumbnailUrl: nullable(entry.thumbnail),
				title: paper.title,
				upvotes: paper.upvotes,
				withdrawnAt: nullable(paper.withdrawnAt),
			},
			rank: index + 1,
		};
	});
}
