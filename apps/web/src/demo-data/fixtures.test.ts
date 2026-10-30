import * as schema from "@hackerfeed/backend/database/schema";
import { getTableColumns, getTableName, is } from "drizzle-orm";
import { getTableConfig, SQLiteTable } from "drizzle-orm/sqlite-core";
import { describe, expect, it, vi } from "vitest";
import { databaseFixtures as fixtures } from "./database";
import { type DemoItem, feeds, items } from "./hacker-news";

const tables: SQLiteTable[] = Object.values(schema).filter((value) =>
	is(value, SQLiteTable),
);

function columnProblem(
	column: ReturnType<typeof getTableColumns>[string],
	value: unknown,
): string | null {
	if (value === null) {
		return column.notNull ? "is null but the column is NOT NULL" : null;
	}
	const expected = {
		boolean: "boolean",
		number: "number",
		string: "string",
	}[column.dataType as string];
	if (expected && typeof value !== expected) {
		return `should be a ${expected}, got ${JSON.stringify(value)}`;
	}
	if (column.dataType === "number" && !Number.isInteger(value)) {
		return `should be an integer, got ${value}`;
	}
	const enumValues = (column as { enumValues?: string[] }).enumValues;
	if (enumValues?.length && !enumValues.includes(value as string)) {
		return `should be one of ${enumValues.join(", ")}, got ${value}`;
	}
	if (
		/(At|Date)$/.test(column.name) &&
		Number.isNaN(Date.parse(value as string))
	) {
		return `should be a date, got ${JSON.stringify(value)}`;
	}
	return null;
}

describe("demo database rows", () => {
	it("has rows for every table", () => {
		expect([...fixtures.keys()].sort()).toEqual(
			tables.map((table) => getTableName(table)).sort(),
		);
	});

	// Adding, renaming or retyping a column fails here until every fixture row
	// is updated, so previews always show the new field.
	it("gives every row every column, with the column's type", () => {
		const problems: string[] = [];
		for (const table of tables) {
			const name = getTableName(table);
			const columns = getTableColumns(table);
			for (const [index, row] of (fixtures.get(name) ?? []).entries()) {
				const where = `${name} row ${index + 1} (id ${row.id})`;
				for (const [key, column] of Object.entries(columns)) {
					if (!(key in row)) {
						problems.push(
							`${where}: missing "${key}" (${column.columnType}${column.notNull ? ", NOT NULL" : ""})`,
						);
						continue;
					}
					const problem = columnProblem(column, row[key]);
					if (problem) problems.push(`${where}: "${key}" ${problem}`);
				}
				for (const key of Object.keys(row)) {
					if (!(key in columns))
						problems.push(`${where}: "${key}" is not a column`);
				}
			}
		}
		expect(problems).toEqual([]);
	});

	it("only references rows that exist in the fixtures", () => {
		const problems: string[] = [];
		for (const table of tables) {
			const name = getTableName(table);
			const columnKey = (columnName: string, of = table) =>
				Object.entries(getTableColumns(of)).find(
					([, column]) => column.name === columnName,
				)?.[0] ?? columnName;
			for (const foreignKey of getTableConfig(table).foreignKeys) {
				const { columns, foreignColumns, foreignTable } =
					foreignKey.reference();
				const targetRows = fixtures.get(getTableName(foreignTable)) ?? [];
				const from = columnKey(columns[0].name);
				const to = columnKey(foreignColumns[0].name, foreignTable);
				for (const row of fixtures.get(name) ?? []) {
					const value = row[from];
					if (
						value !== null &&
						!targetRows.some((target) => target[to] === value)
					) {
						problems.push(
							`${name} (id ${row.id}): ${from} ${value} not found in ${getTableName(foreignTable)}`,
						);
					}
				}
			}
		}
		expect(problems).toEqual([]);
	});
});

describe("demo Hacker News items", () => {
	const byId = new Map(items.map((item) => [item.id, item]));
	const countDescendants = (item: DemoItem): number =>
		(item.kids ?? []).reduce((total, kid) => {
			const child = byId.get(kid);
			return child ? total + 1 + countDescendants(child) : total;
		}, 0);

	it("only lists stories in the feeds", () => {
		for (const ids of Object.values(feeds)) {
			for (const id of ids)
				expect(byId.get(id)?.type, `item ${id}`).toBe("story");
		}
	});

	it("links comments to existing parents and counts them on each story", () => {
		for (const item of items) {
			for (const kid of item.kids ?? []) {
				const child = byId.get(kid);
				expect(
					child?.type === "comment" && child.parent,
					`comment ${kid}`,
				).toBe(item.id);
			}
			if (item.type === "story") {
				expect(item.descendants, `story ${item.id}`).toBe(
					countDescendants(item),
				);
			}
		}
	});

	it("is served by the app in demo builds", async () => {
		vi.stubEnv("VITE_DEMO_DATA", "true");
		const { fetchComment, fetchFeedStoryIds, fetchStory, HackerNewsFeedKey } =
			await import("#/lib/hacker-news/queries");

		expect(await fetchFeedStoryIds(HackerNewsFeedKey.Top)).toEqual(feeds.top);
		for (const item of items) {
			const fetched =
				item.type === "story"
					? await fetchStory(item.id)
					: await fetchComment(item.id);
			expect(fetched?.id, `item ${item.id}`).toBe(item.id);
		}
		vi.unstubAllEnvs();
	});
});
