import type { Database, SqlValue } from "sql.js";
import type { D1DatabaseBinding } from "./client";

/**
 * Exposes a sql.js database through the subset of the D1 binding API that
 * Drizzle and Sentry call, so the app's queries run unchanged against it.
 */
export function createSqliteD1Binding(database: Database): D1DatabaseBinding {
	const execute = (sql: string, params: unknown[]) => {
		const statement = database.prepare(sql);
		try {
			statement.bind(params.map(toSqlValue));
			const rows: SqlValue[][] = [];
			while (statement.step()) rows.push(statement.get());
			return { columns: statement.getColumnNames(), rows };
		} finally {
			statement.free();
		}
	};

	const result = (sql: string, params: unknown[]) => {
		const { columns, rows } = execute(sql, params);
		return {
			success: true,
			results: rows.map((row) =>
				Object.fromEntries(columns.map((column, i) => [column, row[i]])),
			),
			meta: { changes: database.getRowsModified() },
		};
	};

	const statement = (sql: string, params: unknown[] = []) => ({
		sql,
		params,
		bind: (...values: unknown[]) => statement(sql, values),
		all: async () => result(sql, params),
		run: async () => result(sql, params),
		raw: async () => execute(sql, params).rows,
		first: async (column?: string) => {
			const row = result(sql, params).results[0];
			if (!row) return null;
			return column ? row[column] : row;
		},
	});

	type Statement = ReturnType<typeof statement>;

	return {
		prepare: (sql: string) => statement(sql),
		batch: async (statements: Statement[]) => {
			database.run("BEGIN");
			try {
				const results = statements.map((s) => result(s.sql, s.params));
				database.run("COMMIT");
				return results;
			} catch (error) {
				database.run("ROLLBACK");
				throw error;
			}
		},
		exec: async (sql: string) => {
			database.exec(sql);
			return { count: 0, duration: 0 };
		},
	} as unknown as D1DatabaseBinding;
}

function toSqlValue(value: unknown): SqlValue {
	if (value === undefined) return null;
	if (typeof value === "boolean") return value ? 1 : 0;
	return value as SqlValue;
}
