import papersSnapshot from "./snapshot/papers.json";

/**
 * The day's Hugging Face papers (snapshot/papers.json, refreshed with
 * `bun run demo-data:refresh`), keeping only what the app shows. The demo
 * tables are built from these; columns the app never shows get defaults.
 */
export type SnapshotPaper = {
	rank: number;
	entryPublishedAt: string;
	isAuthorParticipating: boolean;
	arxivId: string;
	title: string;
	summary: string;
	aiSummary: string | null;
	paperPublishedAt: string;
	upvotes: number;
	projectPage: string | null;
	githubRepo: string | null;
	organization: { id: string; name: string; fullname: string | null } | null;
	/** Visible author names, in order. */
	authors: string[];
	keywords: string[];
};

export const snapshotPapers: SnapshotPaper[] =
	papersSnapshot.papers as SnapshotPaper[];
