import "@tanstack/react-start/server-only";

import {
	type Account,
	BUILT_IN_PALETTES,
	DEFAULT_PALETTE,
	MAX_PALETTES_PER_USER,
	type Palette,
	type PaletteInput,
	type PreferencesUpdateInput,
} from "@hackerfeed/contracts/appearance";
import {
	type AuthenticatedWorkosUser,
	resolveCurrentWorkosUser,
} from "../auth/current-user";
import type { DatabaseContext } from "../database/client";
import { createUserServiceFromDatabase } from "../users/service";
import {
	type AppearanceRepository,
	createAppearanceRepository,
	type PaletteRow,
} from "./repository";

type CurrentUserInput = Parameters<typeof resolveCurrentWorkosUser>[0];

type UserServiceDependency = {
	getOrCreateAppUser(
		identity: AuthenticatedWorkosUser,
	): PromiseLike<{ id: string }>;
};

export class PaletteNotFoundError extends Error {
	constructor() {
		super("That palette was not found");
		this.name = "PaletteNotFoundError";
	}
}

export class PaletteLimitError extends Error {
	constructor() {
		super(`You can keep up to ${MAX_PALETTES_PER_USER} palettes`);
		this.name = "PaletteLimitError";
	}
}

const toPalette = (row: PaletteRow): Palette => ({
	id: row.id,
	name: row.name,
	baseRole: row.baseRole,
	baseColor: row.baseColor,
	accentColor: row.accentColor,
	builtIn: false,
});

const findBuiltIn = (id: string) =>
	BUILT_IN_PALETTES.find((palette) => palette.id === id);

export function createAppearanceService(
	appearance: AppearanceRepository,
	users: UserServiceDependency,
) {
	async function getAppUserId(user: CurrentUserInput) {
		return (await users.getOrCreateAppUser(resolveCurrentWorkosUser(user))).id;
	}

	async function findPalette(appUserId: string, id: string) {
		const builtIn = findBuiltIn(id);
		if (builtIn) return builtIn;
		const row = await appearance.getPalette(appUserId, id);
		return row ? toPalette(row) : null;
	}

	async function getAccountFor(appUserId: string): Promise<Account> {
		const row = await appearance.getPreferences(appUserId);
		const palette = row?.paletteId
			? await findPalette(appUserId, row.paletteId)
			: null;

		return {
			preferences: {
				mode: row?.mode ?? "auto",
				palette: palette ?? DEFAULT_PALETTE,
				saved: row !== null,
			},
		};
	}

	return {
		async getAccount(user: CurrentUserInput) {
			return getAccountFor(await getAppUserId(user));
		},

		async updatePreferences(
			user: CurrentUserInput,
			changes: PreferencesUpdateInput,
		) {
			const appUserId = await getAppUserId(user);
			if (
				changes.paletteId &&
				!(await findPalette(appUserId, changes.paletteId))
			)
				throw new PaletteNotFoundError();

			await appearance.savePreferences(appUserId, changes);
			return getAccountFor(appUserId);
		},

		async listPalettes(user: CurrentUserInput): Promise<Palette[]> {
			const rows = await appearance.listPalettes(await getAppUserId(user));
			return [...BUILT_IN_PALETTES, ...rows.map(toPalette)];
		},

		async createPalette(user: CurrentUserInput, input: PaletteInput) {
			const appUserId = await getAppUserId(user);
			if ((await appearance.countPalettes(appUserId)) >= MAX_PALETTES_PER_USER)
				throw new PaletteLimitError();

			return toPalette(await appearance.createPalette(appUserId, input));
		},

		async updatePalette(
			user: CurrentUserInput,
			id: string,
			input: PaletteInput,
		) {
			const row = await appearance.updatePalette(
				await getAppUserId(user),
				id,
				input,
			);
			if (!row) throw new PaletteNotFoundError();

			return toPalette(row);
		},

		async deletePalette(user: CurrentUserInput, id: string) {
			await appearance.deletePalette(await getAppUserId(user), id);
		},
	};
}

export function createAppearanceServiceFromDatabase(database: DatabaseContext) {
	return createAppearanceService(
		createAppearanceRepository(database),
		createUserServiceFromDatabase(database),
	);
}

export type AppearanceService = ReturnType<typeof createAppearanceService>;
