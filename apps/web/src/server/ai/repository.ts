import "@tanstack/react-start/server-only";

import { and, asc, eq, sql } from "drizzle-orm";
import type { DatabaseContext } from "#/server/database/client";
import { aiProviderConnections, aiProviders } from "#/server/database/schema";

export type AiProviderRow = typeof aiProviders.$inferSelect;
export type AiProviderConnectionRow = typeof aiProviderConnections.$inferSelect;

export type SaveAiProviderConnectionInput = {
	clientId: string | null;
	registrationMetadata: string;
	subject: string;
	email: string | null;
	name: string | null;
	accessToken: string;
	refreshToken: string | null;
	accessTokenExpiresAt: number;
	scopes: string;
};

export type UpdateAiProviderTokensInput = Pick<
	SaveAiProviderConnectionInput,
	"accessToken" | "refreshToken" | "accessTokenExpiresAt" | "scopes"
>;

function connectionFor(appUserId: string, providerId: string) {
	return and(
		eq(aiProviderConnections.appUserId, appUserId),
		eq(aiProviderConnections.providerId, providerId),
	);
}

export function createAiProviderRepository(database: DatabaseContext) {
	return {
		async listEnabledProviders(): Promise<AiProviderRow[]> {
			return database
				.select()
				.from(aiProviders)
				.where(eq(aiProviders.enabled, true))
				.orderBy(asc(aiProviders.sortOrder), asc(aiProviders.name));
		},

		async findEnabledProvider(id: string): Promise<AiProviderRow | null> {
			const [provider] = await database
				.select()
				.from(aiProviders)
				.where(and(eq(aiProviders.id, id), eq(aiProviders.enabled, true)))
				.limit(1);
			return provider ?? null;
		},

		async listConnections(
			appUserId: string,
		): Promise<AiProviderConnectionRow[]> {
			return database
				.select()
				.from(aiProviderConnections)
				.where(eq(aiProviderConnections.appUserId, appUserId));
		},

		async findConnection(
			appUserId: string,
			providerId: string,
		): Promise<AiProviderConnectionRow | null> {
			const [connection] = await database
				.select()
				.from(aiProviderConnections)
				.where(connectionFor(appUserId, providerId))
				.limit(1);
			return connection ?? null;
		},

		async saveConnection(
			appUserId: string,
			providerId: string,
			input: SaveAiProviderConnectionInput,
		): Promise<void> {
			await database
				.insert(aiProviderConnections)
				.values({ appUserId, providerId, ...input })
				.onConflictDoUpdate({
					target: [
						aiProviderConnections.appUserId,
						aiProviderConnections.providerId,
					],
					set: { ...input, updatedAt: sql`CURRENT_TIMESTAMP` },
				})
				.run();
		},

		async updateTokens(
			appUserId: string,
			providerId: string,
			input: UpdateAiProviderTokensInput,
		): Promise<void> {
			await database
				.update(aiProviderConnections)
				.set({ ...input, updatedAt: sql`CURRENT_TIMESTAMP` })
				.where(connectionFor(appUserId, providerId))
				.run();
		},

		/** Keeps the registration so reconnecting doesn't register a new client. */
		async clearTokens(appUserId: string, providerId: string): Promise<void> {
			await database
				.update(aiProviderConnections)
				.set({
					accessToken: null,
					refreshToken: null,
					accessTokenExpiresAt: null,
					scopes: "",
					updatedAt: sql`CURRENT_TIMESTAMP`,
				})
				.where(connectionFor(appUserId, providerId))
				.run();
		},
	};
}

export type AiProviderRepository = ReturnType<
	typeof createAiProviderRepository
>;
