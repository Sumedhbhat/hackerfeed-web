import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import initSqlJs from "sql.js";
import { describe, expect, it } from "vitest";
import { buildDemoDataSql, DEMO_USER_ID } from "#/demo-data/seed-sql";
import { createFavoriteRepository } from "#/server/favorites/repository";
import { createDatabaseContext } from "./client";
import { appUsers } from "./schema";
import { createSqliteD1Binding } from "./sqlite-d1";

const MIGRATIONS_DIR = join(import.meta.dirname, "../../../migrations");

async function openDemoDatabase() {
	const SQL = await initSqlJs();
	const database = new SQL.Database();
	database.exec("PRAGMA foreign_keys = ON");
	for (const file of readdirSync(MIGRATIONS_DIR)
		.filter((name) => name.endsWith(".sql"))
		.sort()) {
		database.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
	}
	database.exec(buildDemoDataSql());
	return createDatabaseContext(createSqliteD1Binding(database));
}

describe("sql.js D1 binding", () => {
	it("serves the demo data through the app's repositories", async () => {
		const repository = createFavoriteRepository(await openDemoDatabase());

		const favorites = await repository.listFavorites(DEMO_USER_ID);

		expect(favorites.length).toBeGreaterThan(0);
	});

	it("copies the demo user's rows to a new user", async () => {
		const database = await openDemoDatabase();
		const repository = createFavoriteRepository(database);

		await database
			.insert(appUsers)
			.values({ id: "new-user", workosUserId: "workos-new-user" });

		expect(await repository.listFavorites("new-user")).toHaveLength(
			(await repository.listFavorites(DEMO_USER_ID)).length,
		);
	});

	it("rolls back a batch that fails", async () => {
		const database = await openDemoDatabase();

		await expect(
			database.batch([
				database.delete(appUsers).where(eq(appUsers.id, DEMO_USER_ID)),
				database.insert(appUsers).values({ id: "x", workosUserId: "y" }),
				database.insert(appUsers).values({ id: "x", workosUserId: "z" }),
			]),
		).rejects.toThrow();

		const users = await database.select().from(appUsers);
		expect(users.map((user) => user.id)).toEqual([DEMO_USER_ID]);
	});
});
