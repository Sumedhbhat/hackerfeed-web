import "@tanstack/react-start/server-only";

import { eq, sql } from "drizzle-orm";
import type { DatabaseContext } from "#/server/database/client";
import { chatgptConnections } from "#/server/database/schema";

export type ChatGptConnectionRow = typeof chatgptConnections.$inferSelect;

export type SaveChatGptConnectionInput = {
	clientId: string;
	hostId: string;
	subject: string;
	email: string | null;
	name: string | null;
	accessToken: string;
	refreshToken: string | null;
	accessTokenExpiresAt: number;
	scopes: string;
};

export type UpdateChatGptTokensInput = Pick<
	SaveChatGptConnectionInput,
	"accessToken" | "refreshToken" | "accessTokenExpiresAt" | "scopes"
>;

export function createChatGptConnectionRepository(database: DatabaseContext) {
	return {
		async findByAppUserId(
			appUserId: string,
		): Promise<ChatGptConnectionRow | null> {
			const [connection] = await database
				.select()
				.from(chatgptConnections)
				.where(eq(chatgptConnections.appUserId, appUserId))
				.limit(1);
			return connection ?? null;
		},

		async save(
			appUserId: string,
			input: SaveChatGptConnectionInput,
		): Promise<void> {
			await database
				.insert(chatgptConnections)
				.values({ appUserId, ...input })
				.onConflictDoUpdate({
					target: chatgptConnections.appUserId,
					set: { ...input, updatedAt: sql`CURRENT_TIMESTAMP` },
				})
				.run();
		},

		async updateTokens(
			appUserId: string,
			input: UpdateChatGptTokensInput,
		): Promise<void> {
			await database
				.update(chatgptConnections)
				.set({ ...input, updatedAt: sql`CURRENT_TIMESTAMP` })
				.where(eq(chatgptConnections.appUserId, appUserId))
				.run();
		},

		/** Keeps the registration (client id, host id) so reconnecting reuses it. */
		async clearTokens(appUserId: string): Promise<void> {
			await database
				.update(chatgptConnections)
				.set({
					accessToken: null,
					refreshToken: null,
					accessTokenExpiresAt: null,
					scopes: "",
					updatedAt: sql`CURRENT_TIMESTAMP`,
				})
				.where(eq(chatgptConnections.appUserId, appUserId))
				.run();
		},
	};
}

export type ChatGptConnectionRepository = ReturnType<
	typeof createChatGptConnectionRepository
>;
