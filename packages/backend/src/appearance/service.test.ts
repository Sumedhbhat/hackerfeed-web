import {
	BUILT_IN_PALETTES,
	DEFAULT_PALETTE,
	MAX_PALETTES_PER_USER,
	type PaletteInput,
	type ThemeMode,
} from "@hackerfeed/contracts/appearance";
import { describe, expect, it } from "vitest";
import type {
	AppearanceRepository,
	PaletteRow,
	PreferencesRow,
} from "./repository";
import {
	createAppearanceService,
	PaletteLimitError,
	PaletteNotFoundError,
} from "./service";

const sunset: PaletteInput = {
	name: "Sunset",
	baseRole: "background",
	baseColor: "#FFF6D5",
	accentColor: "#7C3AED",
};

/** The repository's behaviour over two in-memory tables. */
function createHarness() {
	const preferences = new Map<string, PreferencesRow>();
	const palettes: PaletteRow[] = [];
	const own = (appUserId: string, id: string) =>
		palettes.find((row) => row.appUserId === appUserId && row.id === id);

	const repository: AppearanceRepository = {
		async getPreferences(appUserId) {
			return preferences.get(appUserId) ?? null;
		},
		async savePreferences(appUserId, changes) {
			const existing = preferences.get(appUserId);
			preferences.set(appUserId, {
				appUserId,
				mode: changes.mode ?? existing?.mode ?? ("auto" satisfies ThemeMode),
				paletteId: changes.paletteId ?? existing?.paletteId ?? null,
				updatedAt: "2026-11-10 00:00:00",
			});
		},
		async listPalettes(appUserId) {
			return palettes.filter((row) => row.appUserId === appUserId);
		},
		async getPalette(appUserId, id) {
			return own(appUserId, id) ?? null;
		},
		async countPalettes(appUserId) {
			return palettes.filter((row) => row.appUserId === appUserId).length;
		},
		async createPalette(appUserId, input) {
			const row: PaletteRow = {
				id: `palette-${palettes.length + 1}`,
				appUserId,
				...input,
				createdAt: "2026-11-10 00:00:00",
				updatedAt: "2026-11-10 00:00:00",
			};
			palettes.push(row);
			return row;
		},
		async updatePalette(appUserId, id, input) {
			const row = own(appUserId, id);
			if (!row) return null;
			Object.assign(row, input);
			return row;
		},
		async deletePalette(appUserId, id) {
			const row = own(appUserId, id);
			if (!row) return;
			palettes.splice(palettes.indexOf(row), 1);
			const saved = preferences.get(appUserId);
			if (saved?.paletteId === id) saved.paletteId = null;
		},
	};
	const service = createAppearanceService(repository, {
		async getOrCreateAppUser({ workosUserId }) {
			return { id: `app-${workosUserId}` };
		},
	});

	return { preferences, service };
}

const reader = { workosUserId: "reader" };
const stranger = { workosUserId: "stranger" };

describe("appearance service", () => {
	it("answers with the defaults, unsaved, for a reader who never chose", async () => {
		const { preferences, service } = createHarness();

		expect(await service.getAccount(reader)).toEqual({
			preferences: { mode: "auto", palette: DEFAULT_PALETTE, saved: false },
		});
		expect(preferences.size).toBe(0);
	});

	it("saves a mode without touching the palette, and the other way round", async () => {
		const { service } = createHarness();

		await service.updatePreferences(reader, { paletteId: "ember" });
		const account = await service.updatePreferences(reader, { mode: "dark" });

		expect(account.preferences).toMatchObject({
			mode: "dark",
			palette: { id: "ember", builtIn: true },
			saved: true,
		});
	});

	it("lists the built-in palettes, then the reader's own", async () => {
		const { service } = createHarness();
		const created = await service.createPalette(reader, sunset);
		await service.createPalette(stranger, { ...sunset, name: "Theirs" });

		expect(await service.listPalettes(reader)).toEqual([
			...BUILT_IN_PALETTES,
			{ ...sunset, id: created.id, builtIn: false },
		]);
	});

	it("refuses to select, change or remove someone else's palette", async () => {
		const { service } = createHarness();
		const theirs = await service.createPalette(stranger, sunset);

		await expect(
			service.updatePreferences(reader, { paletteId: theirs.id }),
		).rejects.toBeInstanceOf(PaletteNotFoundError);
		await expect(
			service.updatePalette(reader, theirs.id, sunset),
		).rejects.toBeInstanceOf(PaletteNotFoundError);
		await service.deletePalette(reader, theirs.id);
		expect(await service.listPalettes(stranger)).toHaveLength(
			BUILT_IN_PALETTES.length + 1,
		);
	});

	it("falls back to the default palette when the selected one is deleted", async () => {
		const { service } = createHarness();
		const created = await service.createPalette(reader, sunset);
		await service.updatePreferences(reader, {
			mode: "light",
			paletteId: created.id,
		});

		await service.deletePalette(reader, created.id);

		expect((await service.getAccount(reader)).preferences).toEqual({
			mode: "light",
			palette: DEFAULT_PALETTE,
			saved: true,
		});
	});

	it("stops at the palette limit", async () => {
		const { service } = createHarness();
		for (let index = 0; index < MAX_PALETTES_PER_USER; index++)
			await service.createPalette(reader, sunset);

		await expect(service.createPalette(reader, sunset)).rejects.toBeInstanceOf(
			PaletteLimitError,
		);
	});
});
