import "@tanstack/react-start/server-only";

import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import type * as schema from "./schema";

/**
 * The app's SQLite database, whichever driver the deploy target opens it with
 * (`src/platform`). Repositories only see this type.
 */
export type DatabaseContext = BaseSQLiteDatabase<
	"async",
	unknown,
	typeof schema
> &
	Pick<LibSQLDatabase<typeof schema>, "batch">;

const globalForDatabase = globalThis as typeof globalThis & {
	hackerfeedDatabase?: DatabaseContext;
};

export function setDatabaseContext(database: DatabaseContext): void {
	globalForDatabase.hackerfeedDatabase = database;
}

export function getDatabaseContext(): DatabaseContext {
	if (!globalForDatabase.hackerfeedDatabase) {
		throw new Error("HackerFeed database context is not available");
	}

	return globalForDatabase.hackerfeedDatabase;
}
