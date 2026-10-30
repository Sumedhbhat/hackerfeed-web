// Fails when backend code reaches the browser bundle. Drizzle declares each
// table as sqliteTable("name", { ...columns }), which bundles to `"name",{`.
// Only backend runtime code has that shape, so finding it in dist/client means
// a non-type import pulled the backend in.
//
//   bun tools/workspace/src/check-client-bundle.ts [dist/client]
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(import.meta.dirname, "../../..");

export function backendMarkers(schemaSource: string): string[] {
	return [...schemaSource.matchAll(/sqliteTable\(\s*"([^"]+)"/g)].map(
		(match) => match[1],
	);
}

function* files(directory: string): Generator<string> {
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) yield* files(path);
		else if (/\.(js|mjs|html)$/.test(entry.name)) yield path;
	}
}

export function findBackendCode(
	bundleDirectory: string,
	markers: string[],
): string[] {
	return [...files(bundleDirectory)].flatMap((path) => {
		const text = readFileSync(path, "utf8");
		return markers
			.filter((name) =>
				new RegExp(`["'\`]${name}["'\`]\\s*,\\s*\\{`).test(text),
			)
			.map((name) => `${path}: table ${name}`);
	});
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const bundle = process.argv[2] ?? join(root, "dist/client");
	const markers = backendMarkers(
		readFileSync(join(root, "packages/backend/src/database/schema.ts"), "utf8"),
	);
	if (markers.length === 0) {
		console.error("Found no table names in the backend schema");
		process.exit(1);
	}
	const found = findBackendCode(bundle, markers);
	if (found.length > 0) {
		console.error(
			`Backend code is in the browser bundle:\n${found.join("\n")}`,
		);
		process.exit(1);
	}
	console.log(
		`No backend code in ${bundle} (${markers.length} table names checked)`,
	);
}
