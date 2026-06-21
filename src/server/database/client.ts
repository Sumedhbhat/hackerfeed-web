import "@tanstack/react-start/server-only";

import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export type D1DatabaseBinding = Env["DB"];

export function createDatabaseContext(binding: D1DatabaseBinding) {
	return drizzle(binding, { schema });
}

export type DatabaseContext = ReturnType<typeof createDatabaseContext>;

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
