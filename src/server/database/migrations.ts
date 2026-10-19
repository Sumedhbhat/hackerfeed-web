/**
 * Applies `migrations/*.sql` in filename order, recording each in
 * `d1_migrations`. That is wrangler's bookkeeping table, so a database can be
 * exported from one host and imported into another without re-running or
 * skipping migrations.
 */
export type Migration = { name: string; sql: string };

export type MigrationExecutor = {
	/** Runs a single statement and returns its rows. */
	query(sql: string): Promise<Array<Record<string, unknown>>>;
	/** Runs a file that may hold several statements. */
	executeScript(sql: string): Promise<void>;
};

const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS d1_migrations(
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT UNIQUE,
	applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
)`;

function quote(value: string) {
	return `'${value.replaceAll("'", "''")}'`;
}

export async function applyMigrations(
	executor: MigrationExecutor,
	migrations: Migration[],
): Promise<string[]> {
	await executor.query(CREATE_TABLE);
	const rows = await executor.query("SELECT name FROM d1_migrations");
	const applied = new Set(rows.map((row) => String(row.name)));

	const pending = [...migrations]
		.sort((a, b) => a.name.localeCompare(b.name))
		.filter((migration) => !applied.has(migration.name));

	for (const migration of pending) {
		const body = migration.sql.trimEnd();
		const terminator = body.endsWith(";") ? "" : ";";
		await executor.executeScript(
			`${body}\n${terminator}\nINSERT INTO d1_migrations (name) VALUES (${quote(migration.name)});`,
		);
	}

	return pending.map((migration) => migration.name);
}
