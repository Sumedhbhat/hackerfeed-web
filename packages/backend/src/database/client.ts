import "@tanstack/react-start/server-only";

import { type AnyD1Database, drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export type D1DatabaseBinding = AnyD1Database;

export function createDatabaseContext(binding: D1DatabaseBinding) {
	return drizzle(binding, { schema });
}

export type DatabaseContext = ReturnType<typeof createDatabaseContext>;
