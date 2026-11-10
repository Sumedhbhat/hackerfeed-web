import type { hfPapers } from "@hackerfeed/backend/database/schema";
import { ingestedTimestamps } from "../defaults";
import { snapshotPapers } from "../snapshot";
import { organizationId } from "./organizations";

type Paper = typeof hfPapers.$inferSelect;

export const paperId = (arxivId: string) => `demo-paper-${arxivId}`;

export const paperRows: Paper[] = snapshotPapers.map((paper) => ({
	id: paperId(paper.arxivId),
	arxivId: paper.arxivId,
	organizationId: paper.organization
		? organizationId(paper.organization.id)
		: null,
	title: paper.title,
	summary: paper.summary,
	aiSummary: paper.aiSummary,
	aiSummaryModel: null,
	paperPublishedAt: paper.paperPublishedAt,
	upvotes: paper.upvotes,
	discussionId: `demo-discussion-${paper.arxivId}`,
	projectPage: paper.projectPage,
	githubRepo: paper.githubRepo,
	thumbnailUrl: null,
	withdrawnAt: null,
	...ingestedTimestamps,
}));
