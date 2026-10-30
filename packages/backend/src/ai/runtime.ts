import "@tanstack/react-start/server-only";

import type {
	HackerNewsCommentRecord,
	HackerNewsStoryRecord,
} from "@hackerfeed/hacker-news/records";
import type { AuthenticatedWorkosUser } from "../auth/current-user";
import { getDatabaseContext } from "../database/client";
import { isFeatureEnabled } from "../feature-flags/service";
import { createUserServiceFromDatabase } from "../users/service";
import { createAiHttpHandlers } from "./http";
import { createChatGptAdapter } from "./providers/chatgpt/adapter";
import { createAiProviderRepository } from "./repository";
import { createAiProviderService } from "./service";
import { MAX_CONTEXT_COMMENTS } from "./story-context";
import { createTokenCipher } from "./token-crypto";
import type { AiProviderAdapter } from "./types";

export type AiRuntimeConfig = {
	serverUrl?: string;
	tokenEncryptionKey: string;
	chatGpt: { clientId?: string; clientSecret?: string };
	getUser(request: Request): Promise<AuthenticatedWorkosUser | null>;
	fetchStory(
		storyId: number,
		signal?: AbortSignal,
	): Promise<HackerNewsStoryRecord | null>;
	fetchComment(
		commentId: number,
		signal?: AbortSignal,
	): Promise<HackerNewsCommentRecord | null>;
};

export function createAiRuntime(config: AiRuntimeConfig) {
	/**
	 * Adapters available on this deployment. A provider shows up for users when
	 * it is registered here and enabled in the `ai_providers` table.
	 */
	const adapters: AiProviderAdapter[] = [createChatGptAdapter(config.chatGpt)];

	const cipher = createTokenCipher(config.tokenEncryptionKey);

	function getOrigin(request: Request): string {
		const configuredUrl = config.serverUrl?.trim();
		return new URL(configuredUrl || request.url).origin;
	}

	return createAiHttpHandlers({
		cipher,
		getOrigin,
		getUser: config.getUser,
		isEnabled: (user) => isFeatureEnabled("aiChat", user),
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
			const story = await config.fetchStory(storyId, signal);
			if (!story) return null;
			const comments = await Promise.allSettled(
				story.kids
					.slice(0, MAX_CONTEXT_COMMENTS)
					.map((id) => config.fetchComment(id, signal)),
			);
			return {
				story,
				comments: comments.flatMap((result) =>
					result.status === "fulfilled" && result.value ? [result.value] : [],
				),
			};
		},
	});
}
