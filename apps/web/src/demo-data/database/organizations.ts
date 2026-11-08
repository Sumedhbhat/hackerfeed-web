import type { hfOrganizations } from "@hackerfeed/backend/database/schema";
import { ingestedTimestamps } from "../defaults";
import { snapshotPapers } from "../snapshot";

type Organization = typeof hfOrganizations.$inferSelect;

export const organizationId = (hfOrganizationId: string) =>
	`demo-org-${hfOrganizationId}`;

/** Every organization behind a snapshot paper, once each. */
export const organizationRows: Organization[] = [
	...new Map(
		snapshotPapers
			.map((paper) => paper.organization)
			.filter((org) => org !== null)
			.map((org): [string, Organization] => [
				org.id,
				{
					id: organizationId(org.id),
					hfOrganizationId: org.id,
					name: org.name,
					fullname: org.fullname,
					...ingestedTimestamps,
				},
			]),
	).values(),
];
