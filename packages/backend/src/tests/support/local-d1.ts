import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import {
	createDatabaseContext,
	type D1DatabaseBinding,
} from "../../database/client";

/**
 * A real local D1 (workerd, through wrangler) with every migration in
 * `migrations/` applied by wrangler, the way CI migrates production.
 */
export async function startLocalD1() {
	const { createTestHarness } = await import("wrangler");
	const server = createTestHarness({
		root: fileURLToPath(new URL("../../..", import.meta.url)),
		workers: [
			{
				config: {
					name: "hackerfeed-backend-tests",
					main: fileURLToPath(new URL("./d1-host.ts", import.meta.url)),
					compatibility_date: "2025-09-02",
					d1_databases: [
						{
							binding: "DB",
							database_name: "hackerfeed",
							database_id: "hackerfeed-tests",
							migrations_dir: "migrations",
						},
					],
				},
			},
		],
	});
	await server.listen();
	const worker = server.getWorker<{ DB: D1DatabaseBinding }>();
	await worker.applyD1Migrations("DB");
	const { DB: binding } = await worker.getEnv();
	const database = createDatabaseContext(binding);

	return {
		binding,
		/** Deletes every row, keeping the schema and the migration history. */
		async wipe() {
			const tables = await database.all<{ name: string }>(
				sql`select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '_cf_%' and name != 'd1_migrations'`,
			);
			await database.batch([
				database.run(sql`PRAGMA defer_foreign_keys = on`),
				...tables.map(({ name }) =>
					database.run(sql`delete from ${sql.identifier(name)}`),
				),
			]);
		},
		close: () => server.close(),
	};
}
