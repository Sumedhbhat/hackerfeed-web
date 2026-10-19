import { drizzle } from "drizzle-orm/d1";
import * as schema from "#/server/database/schema";

export type D1DatabaseBinding = Parameters<typeof drizzle>[0];

export function createD1Database(binding: D1DatabaseBinding) {
	return drizzle(binding, { schema });
}
