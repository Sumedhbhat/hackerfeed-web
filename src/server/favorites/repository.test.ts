import { describe, expect, it } from "vitest";
import {
	createDatabaseContext,
	type D1DatabaseBinding,
} from "#/server/database/client";
import { createFavoriteRepository } from "./repository";

describe("favorite repository", () => {
	it("orders equal-time favorites by descending ID", async () => {
		const statements: Array<{ sql: string; values: unknown[] }> = [];
		const binding = {
			prepare(sql: string) {
				return {
					bind(...values: unknown[]) {
						statements.push({ sql, values });
						return { raw: async () => [] };
					},
				};
			},
		} as unknown as D1DatabaseBinding;
		const repository = createFavoriteRepository(createDatabaseContext(binding));

		await repository.listFavorites("user-1");

		expect(statements[0]?.values).toContain("user-1");
		expect(statements[0]?.sql).toContain(
			'order by "favorites"."createdAt" desc, "favorites"."id" desc',
		);
	});
});
