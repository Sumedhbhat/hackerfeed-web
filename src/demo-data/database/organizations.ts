import type { hfOrganizations } from "@hackerfeed/backend/database/schema";
import { ingestedTimestamps } from "../defaults";

type Organization = typeof hfOrganizations.$inferSelect;

export const organization = (
	name: string,
	fields: Partial<Organization> = {},
): Organization => ({
	id: `demo-org-${name}`,
	hfOrganizationId: `demo-org-${name}`,
	name,
	fullname: null,
	...ingestedTimestamps,
	...fields,
});

export const placeholderAi = organization("placeholder-ai", {
	fullname: "Placeholder AI Lab",
});
export const exampleUniversity = organization("example-university", {
	fullname: "Example University",
});

export const organizationRows: Organization[] = [
	placeholderAi,
	exampleUniversity,
];
