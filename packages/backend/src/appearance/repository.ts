import "@tanstack/react-start/server-only";

import type { PaletteInput, ThemeMode } from "@hackerfeed/contracts/appearance";
import { and, asc, count, eq, sql } from "drizzle-orm";
import type { DatabaseContext } from "../database/client";
import { palettes, userPreferences } from "../database/schema";

export type PaletteRow = typeof palettes.$inferSelect;
export type PreferencesRow = typeof userPreferences.$inferSelect;

export function createAppearanceRepository(database: DatabaseContext) {
	const ownPalette = (appUserId: string, id: string) =>
		and(eq(palettes.appUserId, appUserId), eq(palettes.id, id));

	return {
		async getPreferences(appUserId: string): Promise<PreferencesRow | null> {
			const [row] = await database
				.select()
				.from(userPreferences)
				.where(eq(userPreferences.appUserId, appUserId))
				.limit(1)
				.all();

			return row ?? null;
		},

		async savePreferences(
			appUserId: string,
			changes: { mode?: ThemeMode; paletteId?: string },
		) {
			await database
				.insert(userPreferences)
				.values({
					appUserId,
					mode: changes.mode ?? "auto",
					paletteId: changes.paletteId ?? null,
				})
				.onConflictDoUpdate({
					target: userPreferences.appUserId,
					set: { ...changes, updatedAt: sql`CURRENT_TIMESTAMP` },
				})
				.run();
		},

		listPalettes(appUserId: string) {
			return database
				.select()
				.from(palettes)
				.where(eq(palettes.appUserId, appUserId))
				.orderBy(asc(palettes.createdAt), asc(palettes.id))
				.all();
		},

		async getPalette(
			appUserId: string,
			id: string,
		): Promise<PaletteRow | null> {
			const [row] = await database
				.select()
				.from(palettes)
				.where(ownPalette(appUserId, id))
				.limit(1)
				.all();

			return row ?? null;
		},

		async countPalettes(appUserId: string) {
			const [row] = await database
				.select({ total: count() })
				.from(palettes)
				.where(eq(palettes.appUserId, appUserId))
				.all();

			return row?.total ?? 0;
		},

		async createPalette(appUserId: string, input: PaletteInput) {
			const [row] = await database
				.insert(palettes)
				.values({ appUserId, ...input })
				.returning()
				.all();
			if (!row) throw new Error("D1 palette insert failed");

			return row;
		},

		async updatePalette(
			appUserId: string,
			id: string,
			input: PaletteInput,
		): Promise<PaletteRow | null> {
			const [row] = await database
				.update(palettes)
				.set({ ...input, updatedAt: sql`CURRENT_TIMESTAMP` })
				.where(ownPalette(appUserId, id))
				.returning()
				.all();

			return row ?? null;
		},

		async deletePalette(appUserId: string, id: string) {
			await database.batch([
				database
					.update(userPreferences)
					.set({ paletteId: null, updatedAt: sql`CURRENT_TIMESTAMP` })
					.where(
						and(
							eq(userPreferences.appUserId, appUserId),
							eq(userPreferences.paletteId, id),
						),
					),
				database.delete(palettes).where(ownPalette(appUserId, id)),
			]);
		},
	};
}

export type AppearanceRepository = ReturnType<
	typeof createAppearanceRepository
>;
