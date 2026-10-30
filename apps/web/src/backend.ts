import "@tanstack/react-start/server-only";

import { createBackend } from "@hackerfeed/backend";
import { env } from "./env";
import { fetchComment, fetchStory } from "./lib/hacker-news/queries";

export const backend = createBackend({
	workos: {
		apiHostname: env.VITE_WORKOS_API_HOSTNAME,
		clientId: env.VITE_WORKOS_CLIENT_ID,
	},
	ai: {
		serverUrl: env.SERVER_URL,
		tokenEncryptionKey: env.AI_TOKEN_ENCRYPTION_KEY,
		chatGpt: {
			clientId: env.CHATGPT_CLIENT_ID,
			clientSecret: env.CHATGPT_CLIENT_SECRET,
		},
		fetchStory,
		fetchComment,
	},
});
