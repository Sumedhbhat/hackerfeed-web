import type {
	aiProviderConnections,
	aiProviders,
} from "#/server/database/schema";
import { sqliteAt } from "../defaults";

export const aiProviderRows: (typeof aiProviders.$inferSelect)[] = [
	{
		id: "chatgpt",
		name: "ChatGPT",
		description: "Use your ChatGPT plan to discuss stories right here.",
		manageUrl: "https://chatgpt.com/settings/usage",
		enabled: true,
		sortOrder: 0,
		createdAt: sqliteAt("00:00:00"),
		updatedAt: sqliteAt("00:00:00"),
	},
];

/** Empty: connections hold sealed OAuth tokens that fixtures cannot fake. */
export const aiProviderConnectionRows: (typeof aiProviderConnections.$inferSelect)[] =
	[];
