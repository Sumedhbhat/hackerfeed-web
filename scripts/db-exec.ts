// Runs a SQL file against the app's libSQL/SQLite database.
// Usage: DATABASE_URL=file:.data/hackerfeed.db bun scripts/db-exec.ts demo-data.sql
import { readFileSync } from "node:fs";
import { createClient } from "@libsql/client";

const file = process.argv[2];
if (!file) {
	console.error("Usage: bun scripts/db-exec.ts <file.sql>");
	process.exit(1);
}

const client = createClient({
	url: process.env.DATABASE_URL || "file:.data/hackerfeed.db",
	authToken: process.env.DATABASE_AUTH_TOKEN,
});
await client.executeMultiple(readFileSync(file, "utf8"));
client.close();
