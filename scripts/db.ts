// Runs the app's migrations, or a SQL file, against a deployed database:
// Cloudflare D1 over its HTTP API when D1_DATABASE_ID is set, otherwise
// libSQL/SQLite at DATABASE_URL. Both keep the same d1_migrations ledger.
// Usage: bun scripts/db.ts migrate
//        bun scripts/db.ts exec <file.sql>
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import {
	applyMigrations,
	type MigrationExecutor,
} from "#/server/database/migrations";

type D1Response = {
	success: boolean;
	errors: Array<{ message: string }>;
	result: Array<{ results: Array<Record<string, unknown>> }>;
};

function openD1(databaseId: string): MigrationExecutor {
	const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN } = process.env;
	if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
		throw new Error("D1 needs CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN");
	}
	const query = async (sql: string) => {
		const response = await fetch(
			`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${databaseId}/query`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ sql }),
			},
		);
		const body = (await response.json()) as D1Response;
		if (!body.success) {
			throw new Error(body.errors.map((error) => error.message).join("; "));
		}
		return body.result.at(-1)?.results ?? [];
	};
	return {
		query,
		executeScript: async (sql) => {
			await query(sql);
		},
	};
}

function openLibsql(): MigrationExecutor {
	const client = createClient({
		url: process.env.DATABASE_URL || "file:.data/hackerfeed.db",
		authToken: process.env.DATABASE_AUTH_TOKEN,
	});
	return {
		query: async (sql) => (await client.execute(sql)).rows,
		executeScript: (sql) => client.executeMultiple(sql),
	};
}

const [command, file] = process.argv.slice(2);
const database = process.env.D1_DATABASE_ID
	? openD1(process.env.D1_DATABASE_ID)
	: openLibsql();

if (command === "migrate") {
	const migrations = readdirSync("migrations")
		.filter((name) => name.endsWith(".sql"))
		.map((name) => ({
			name,
			sql: readFileSync(join("migrations", name), "utf8"),
		}));
	const applied = await applyMigrations(database, migrations);
	console.log(
		applied.length ? `Applied ${applied.join(", ")}` : "No pending migrations",
	);
} else if (command === "exec" && file) {
	await database.executeScript(readFileSync(file, "utf8"));
} else {
	console.error("Usage: bun scripts/db.ts migrate | exec <file.sql>");
	process.exit(1);
}
