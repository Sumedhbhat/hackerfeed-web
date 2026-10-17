import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getTableColumns, getTableName, is } from "drizzle-orm";
import { getTableConfig, SQLiteTable } from "drizzle-orm/sqlite-core";
import * as schema from "#/server/database/schema";

/** The app user whose rows are copied to every user who signs in. */
export const DEMO_USER_ID = "demo-user";

export const DATABASE_FIXTURES_DIR = join(
	import.meta.dirname,
	"../../fixtures/database",
);

type Table = SQLiteTable;

export type FixtureRow = Record<string, unknown>;

export const tables: Table[] = Object.values(schema).filter(
	(value): value is Table => is(value, SQLiteTable),
);

/** Tables ordered so every table comes after the tables it references. */
export function tablesInInsertOrder(): Table[] {
	const ordered: Table[] = [];
	const visit = (table: Table) => {
		if (ordered.includes(table)) return;
		for (const foreignKey of getTableConfig(table).foreignKeys) {
			const target = foreignKey.reference().foreignTable;
			if (target !== table) visit(target);
		}
		ordered.push(table);
	};
	tables.forEach(visit);
	return ordered;
}

export function loadDatabaseFixtures(
	dir = DATABASE_FIXTURES_DIR,
): Map<string, FixtureRow[]> {
	const fixtures = new Map<string, FixtureRow[]>();
	for (const file of readdirSync(dir).filter((name) =>
		name.endsWith(".json"),
	)) {
		fixtures.set(
			file.replace(/\.json$/, ""),
			JSON.parse(readFileSync(join(dir, file), "utf8")),
		);
	}
	return fixtures;
}

const quoteIdentifier = (name: string) => `"${name.replaceAll('"', '""')}"`;

function sqlValue(value: unknown): string {
	if (value === null || value === undefined) return "NULL";
	if (typeof value === "boolean") return value ? "1" : "0";
	if (typeof value === "number") return String(value);
	return `'${String(value).replaceAll("'", "''")}'`;
}

/** Tables holding per-user rows, i.e. with an appUserId referencing app_users. */
export function userOwnedTables(): Table[] {
	return tables.filter((table) =>
		getTableConfig(table).foreignKeys.some(
			(foreignKey) =>
				foreignKey.reference().foreignTable === schema.appUsers &&
				foreignKey.reference().columns[0].name === "appUserId",
		),
	);
}

/**
 * Copies the demo user's rows to each newly created user, so whoever signs in
 * to a preview sees favorites and history straight away.
 */
function newUserTrigger(fixtures: Map<string, FixtureRow[]>): string {
	const demoUser = sqlValue(DEMO_USER_ID);
	const copies = userOwnedTables().map((table) => {
		const rows = fixtures.get(getTableName(table)) ?? [];
		const columns = Object.values(getTableColumns(table));
		const select = Object.entries(getTableColumns(table)).map(
			([key, column]) => {
				const name = quoteIdentifier(column.name);
				if (column.primary) return "lower(hex(randomblob(16)))";
				// Columns holding the demo user's id (appUserId, lastUpdatedBy, ...).
				if (rows.some((row) => row[key] === DEMO_USER_ID)) {
					return 'NEW."id"';
				}
				return name;
			},
		);
		return `\tINSERT INTO ${quoteIdentifier(getTableName(table))} (${columns.map((column) => quoteIdentifier(column.name)).join(", ")})\n\t\tSELECT ${select.join(", ")} FROM ${quoteIdentifier(getTableName(table))} WHERE "appUserId" = ${demoUser};`;
	});

	return [
		"DROP TRIGGER IF EXISTS demo_data_new_user;",
		`CREATE TRIGGER demo_data_new_user AFTER INSERT ON "app_users" WHEN NEW."id" <> ${demoUser}\nBEGIN\n${copies.join("\n")}\nEND;`,
	].join("\n");
}

/**
 * SQL that replaces every row in the database with the fixtures. Only for
 * preview databases: it deletes all existing data first.
 */
export function buildDemoDataSql(fixtures = loadDatabaseFixtures()): string {
	const ordered = tablesInInsertOrder();
	const statements = [...ordered]
		.reverse()
		.map((table) => `DELETE FROM ${quoteIdentifier(getTableName(table))};`);

	for (const table of ordered) {
		const columns = Object.entries(getTableColumns(table));
		const names = columns
			.map(([, column]) => quoteIdentifier(column.name))
			.join(", ");
		for (const row of fixtures.get(getTableName(table)) ?? []) {
			const values = columns.map(([key]) => sqlValue(row[key])).join(", ");
			statements.push(
				`INSERT INTO ${quoteIdentifier(getTableName(table))} (${names}) VALUES (${values});`,
			);
		}
	}

	statements.push(newUserTrigger(fixtures));
	return `${statements.join("\n")}\n`;
}
