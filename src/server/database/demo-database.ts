import "@tanstack/react-start/server-only";

import initSqlJs from "sql.js/dist/sql-wasm-browser.js";
import sqliteWasm from "sql.js/dist/sql-wasm-browser.wasm";
import { buildDemoDataSql } from "#/demo-data/seed-sql";
import type { D1DatabaseBinding } from "./client";
import { createSqliteD1Binding } from "./sqlite-d1";

const migrations = import.meta.glob<string>("/migrations/*.sql", {
	query: "?raw",
	import: "default",
	eager: true,
});

let binding: Promise<D1DatabaseBinding> | undefined;

/**
 * Preview builds (VITE_DEMO_DATA=true) have no D1 database. Each Worker
 * isolate builds an in-memory SQLite database from migrations/ and
 * src/demo-data instead, so writes last only until the isolate is recycled.
 */
export function getDemoDatabaseBinding(): Promise<D1DatabaseBinding> {
	binding ??= openDemoDatabase();
	return binding;
}

async function openDemoDatabase() {
	// sql.js reads self.location.href when WorkerGlobalScope exists, and workerd
	// has no location. It only needs a URL synchronously, while starting up.
	const scope = globalThis as { location?: { href: string } };
	const hadLocation = "location" in scope;
	if (!hadLocation) scope.location = { href: "https://sql.js.invalid/" };
	const loading = initSqlJs({
		// Workers can't compile WebAssembly at runtime; the bundler imports it
		// precompiled.
		instantiateWasm(imports, done) {
			WebAssembly.instantiate(sqliteWasm, imports).then((instance) =>
				done(instance),
			);
			return {};
		},
	});
	if (!hadLocation) delete scope.location;
	const SQL = await loading;
	const database = new SQL.Database();
	database.exec("PRAGMA foreign_keys = ON");
	for (const name of Object.keys(migrations).sort()) {
		database.exec(migrations[name]);
	}
	database.exec(buildDemoDataSql());
	return createSqliteD1Binding(database);
}
