import type { hfPapers } from "@hackerfeed/backend/database/schema";
import { ingestedTimestamps } from "../defaults";
import { snapshotPapers } from "../snapshot";
import { organizationId } from "./organizations";

type Paper = typeof hfPapers.$inferSelect;

export const paperId = (arxivId: string) => `demo-paper-${arxivId}`;

/** The snapshot's papers, in its rank order (most upvoted first). */
export const paperRows: Paper[] = snapshotPapers.map(
	({ paper: { organization, authors: _a, keywords: _k, ...paper } }) => ({
		id: paperId(paper.arxivId),
		organizationId: organization
			? organizationId(organization.hfOrganizationId)
			: null,
		...paper,
		...ingestedTimestamps,
	}),
);
