import "@tanstack/react-start/server-only";

import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createClient } from "@libsql/client";
import * as Sentry from "@sentry/node";
import { drizzle } from "drizzle-orm/libsql";
import { logger } from "#/lib/logger";
import { applyMigrations, type Migration } from "#/server/database/migrations";
import * as schema from "#/server/database/schema";
import { getSentryServerOptions } from "./sentry-options";
import type { ServerPlatform } from "./types";

/**
 * Any Node host (a container, a VM, `vite dev`): a SQLite file or a libSQL
 * server at `DATABASE_URL`, Sentry through `@sentry/node`. Migrations run on
 * start-up, so a new volume is ready on the first request.
 */
const DEFAULT_DATABASE_URL = "file:.data/hackerfeed.db";

const migrationFiles = import.meta.glob<string>("/migrations/*.sql", {
	query: "?raw",
	import: "default",
	eager: true,
});

const migrations: Migration[] = Object.entries(migrationFiles).map(
	([path, sql]) => ({ name: path.slice(path.lastIndexOf("/") + 1), sql }),
);

function openClient() {
	const url = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
	if (url.startsWith("file:")) {
		mkdirSync(dirname(url.slice("file:".length)), { recursive: true });
	}
	return createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
}

const client = openClient();
const database = drizzle(client, { schema });

const migrated = applyMigrations(
	{
		query: async (sql) => (await client.execute(sql)).rows,
		executeScript: (sql) => client.executeMultiple(sql),
	},
	migrations,
).then((applied) => {
	if (applied.length) logger.info("Applied migrations", { applied });
});

const sentryOptions = getSentryServerOptions(process.env);
if (sentryOptions && !Sentry.isInitialized()) Sentry.init(sentryOptions);

export const platform: ServerPlatform = {
	openDatabase: async () => database,
	async traceRequest(request, handle) {
		await migrated;
		if (!sentryOptions) return handle();

		const url = new URL(request.url);
		return Sentry.withIsolationScope(() =>
			Sentry.continueTrace(
				{
					sentryTrace: request.headers.get("sentry-trace") ?? undefined,
					baggage: request.headers.get("baggage") ?? undefined,
				},
				() =>
					Sentry.startSpan(
						{
							name: `${request.method} ${url.pathname}`,
							op: "http.server",
							forceTransaction: true,
						},
						handle,
					),
			),
		);
	},
	async traceTask(name, run) {
		await migrated;
		if (!sentryOptions) return run();

		return Sentry.withIsolationScope(() =>
			Sentry.startSpan({ name, op: "task", forceTransaction: true }, run),
		);
	},
};
