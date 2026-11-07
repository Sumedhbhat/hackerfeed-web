import papersSnapshot from "./snapshot/papers.json";

/**
 * The day's Hugging Face papers (snapshot/papers.json, refreshed with
 * `bun run demo-data:refresh`), normalized the way production ingestion
 * stores them. The demo tables below are built from these.
 */
export type SnapshotPaper = {
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
		organization: {
			hfOrganizationId: string;
			name: string;
			fullname: string | null;
		} | null;
		authors: {
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
		}[];
		keywords: {
			keywordOriginal: string;
			keywordNormalized: string;
			position: number;
		}[];
	};
};

export const snapshotPapers: SnapshotPaper[] =
	papersSnapshot.papers as SnapshotPaper[];
