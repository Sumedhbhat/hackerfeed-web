import { readdirSync, readFileSync } from "node:fs";
import { createClient } from "@libsql/client";
import { describe, expect, it } from "vitest";
import { applyMigrations, type MigrationExecutor } from "./migrations";

function memoryExecutor() {
	const client = createClient({ url: ":memory:" });
	const executor: MigrationExecutor = {
		query: async (sql) => (await client.execute(sql)).rows,
		executeScript: (sql) => client.executeMultiple(sql),
	};
	return { client, executor };
}

describe("applyMigrations", () => {
	it("applies pending files in name order and records them like wrangler", async () => {
		const { client, executor } = memoryExecutor();

		const applied = await applyMigrations(executor, [
			{ name: "0002_b.sql", sql: "ALTER TABLE t ADD COLUMN b TEXT" },
			{ name: "0001_a.sql", sql: "CREATE TABLE t (a TEXT);\n-- trailing" },
		]);

		expect(applied).toEqual(["0001_a.sql", "0002_b.sql"]);
		const rows = await client.execute(
			"SELECT name FROM d1_migrations ORDER BY id",
		);
		expect(rows.rows.map((row) => row.name)).toEqual([
			"0001_a.sql",
			"0002_b.sql",
		]);
	});

	it("skips migrations that are already recorded", async () => {
		const { executor } = memoryExecutor();
		const migrations = [{ name: "0001_a.sql", sql: "CREATE TABLE t (a TEXT)" }];

		await applyMigrations(executor, migrations);

		expect(await applyMigrations(executor, migrations)).toEqual([]);
	});

	it("applies the repository's migrations to an empty database", async () => {
		const { executor } = memoryExecutor();
		const migrations = readdirSync("migrations")
			.filter((file) => file.endsWith(".sql"))
			.map((name) => ({
				name,
				sql: readFileSync(`migrations/${name}`, "utf8"),
			}));

		expect(await applyMigrations(executor, migrations)).toHaveLength(
			migrations.length,
		);
	});
});
