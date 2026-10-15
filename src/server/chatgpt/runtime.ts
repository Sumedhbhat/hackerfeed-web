import "@tanstack/react-start/server-only";

import { env } from "#/env";
import { fetchComment, fetchStory } from "#/lib/hacker-news/queries";
import { getCurrentSession, getOrigin } from "#/server/auth/session";
import { getDatabaseContext } from "#/server/database/client";
import { createUserServiceFromDatabase } from "#/server/users/service";
import { createChatGptHttpHandlers } from "./http";
import { createChatGptConnectionRepository } from "./repository";
import { createChatGptService } from "./service";
import { MAX_CONTEXT_COMMENTS } from "./story-context";
import { createTokenCipher } from "./token-crypto";

const cipher = createTokenCipher(
	env.CHATGPT_TOKEN_ENCRYPTION_KEY ?? env.WORKOS_COOKIE_PASSWORD,
);

export const chatGptHttpHandlers = createChatGptHttpHandlers({
	cipher,
	getOrigin,
	getSession: getCurrentSession,
	getService() {
		const database = getDatabaseContext();
		return createChatGptService({
			cipher,
			connections: createChatGptConnectionRepository(database),
			oauth: {
				clientId: env.CHATGPT_CLIENT_ID,
				clientSecret: env.CHATGPT_CLIENT_SECRET,
			},
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
