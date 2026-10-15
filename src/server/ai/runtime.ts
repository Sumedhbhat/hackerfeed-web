import "@tanstack/react-start/server-only";

import { env } from "#/env";
import { fetchComment, fetchStory } from "#/lib/hacker-news/queries";
import { getCurrentSession, getOrigin } from "#/server/auth/session";
import { getDatabaseContext } from "#/server/database/client";
import { createUserServiceFromDatabase } from "#/server/users/service";
import { createAiHttpHandlers } from "./http";
import { createChatGptAdapter } from "./providers/chatgpt/adapter";
import { createAiProviderRepository } from "./repository";
import { createAiProviderService } from "./service";
import { MAX_CONTEXT_COMMENTS } from "./story-context";
import { createTokenCipher } from "./token-crypto";
import type { AiProviderAdapter } from "./types";

/**
 * Adapters available on this deployment. A provider shows up for users when it
 * is registered here and enabled in the `ai_providers` table.
 */
const adapters: AiProviderAdapter[] = [
	createChatGptAdapter({
		clientId: env.CHATGPT_CLIENT_ID,
		clientSecret: env.CHATGPT_CLIENT_SECRET,
	}),
];

const cipher = createTokenCipher(
	env.AI_TOKEN_ENCRYPTION_KEY ?? env.WORKOS_COOKIE_PASSWORD,
);

export const aiHttpHandlers = createAiHttpHandlers({
	cipher,
	getOrigin,
	getSession: getCurrentSession,
	getService() {
		const database = getDatabaseContext();
		return createAiProviderService({
			adapters,
			cipher,
			repository: createAiProviderRepository(database),
			users: createUserServiceFromDatabase(database),
		});
	},
	async getStoryContext(storyId, signal) {
		const story = await fetchStory(storyId, signal);
		if (!story) return null;
		const comments = await Promise.allSettled(
			story.kids
				.slice(0, MAX_CONTEXT_COMMENTS)
				.map((id) => fetchComment(id, signal)),
		);
		return {
			story,
			comments: comments.flatMap((result) =>
				result.status === "fulfilled" && result.value ? [result.value] : [],
			),
		};
	},
});
