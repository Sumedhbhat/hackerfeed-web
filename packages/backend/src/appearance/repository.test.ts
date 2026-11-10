import { describe, expect, it } from "vitest";
import {
	createDatabaseContext,
	type D1DatabaseBinding,
} from "../database/client";
import { createAppearanceRepository } from "./repository";

type CapturedStatement = { sql: string; values: unknown[] };

function createHarness() {
	const statements: CapturedStatement[] = [];
	const batches: CapturedStatement[][] = [];
	const binding = {
		prepare(sql: string) {
			return {
				bind(...values: unknown[]) {
					statements.push({ sql, values });
					return {
						sql,
						values,
						async run() {
							return { success: true };
						},
						async raw() {
							return [];
						},
					};
				},
			};
		},
		async batch(batch: CapturedStatement[]) {
			batches.push(batch);
			return [];
		},
	} as unknown as D1DatabaseBinding;

	return {
		batches,
		repository: createAppearanceRepository(createDatabaseContext(binding)),
		statements,
	};
}

describe("appearance repository", () => {
	it("creates the preferences row on the first choice and changes only what was chosen after that", async () => {
		const { repository, statements } = createHarness();

		await repository.savePreferences("user-1", { mode: "dark" });

		const [statement] = statements;
		expect(statement?.sql).toContain('insert into "user_preferences"');
		expect(statement?.sql).toContain(
			'on conflict ("user_preferences"."appUserId") do update set "mode" = ?, "updatedAt" = CURRENT_TIMESTAMP',
		);
		expect(statement?.sql).not.toContain('"paletteId" = ?');
		expect(statement?.values).toEqual(["user-1", "dark", null, "dark"]);
	});

	it("scopes palette reads and writes to their owner", async () => {
		const { repository, statements } = createHarness();

		await repository.getPalette("user-1", "palette-1");
		await repository.updatePalette("user-1", "palette-1", {
			name: "Sunset",
			baseRole: "text",
			baseColor: "#1C1A18",
			accentColor: "#C25A28",
		});

		for (const statement of statements) {
			expect(statement.sql).toContain('"palettes"."appUserId" = ?');
			expect(statement.values).toEqual(
				expect.arrayContaining(["user-1", "palette-1"]),
			);
		}
	});

	it("unselects a palette in the same batch that deletes it", async () => {
		const { batches, repository } = createHarness();

		await repository.deletePalette("user-1", "palette-1");

		expect(batches).toHaveLength(1);
		const [unselect, remove] = batches[0] ?? [];
		expect(unselect?.sql).toContain(
			'update "user_preferences" set "paletteId" = ?',
		);
		expect(unselect?.values).toEqual([null, "user-1", "palette-1"]);
		expect(remove?.sql).toContain('delete from "palettes"');
		expect(remove?.values).toEqual(["user-1", "palette-1"]);
	});
});
