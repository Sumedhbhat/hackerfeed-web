import { DEFAULT_PALETTE } from "@hackerfeed/contracts/appearance";
import { describe, expect, it } from "vitest";
import {
	type AppearanceService,
	PaletteLimitError,
	PaletteNotFoundError,
} from "../appearance/service";
import type { DatabaseContext } from "../database/client";
import { createTrpcContext } from "./context";
import { createAppRouter } from "./router";

const account = {
	preferences: { mode: "auto", palette: DEFAULT_PALETTE, saved: false },
} as const;
const paletteId = "3f0e7c0a-5b0e-4f43-9d0b-1c2d3e4f5a6b";
const sunset = {
	name: "Sunset",
	baseRole: "background",
	baseColor: "#FFF6D5",
	accentColor: "#7C3AED",
} as const;

function createHarness(overrides: Partial<AppearanceService> = {}) {
	const database = {} as DatabaseContext;
	const calls: unknown[][] = [];
	const appearance: AppearanceService = {
		async getAccount(...args) {
			calls.push(["getAccount", ...args]);
			return account;
		},
		async updatePreferences(...args) {
			calls.push(["updatePreferences", ...args]);
			return account;
		},
		async listPalettes(...args) {
			calls.push(["listPalettes", ...args]);
			return [DEFAULT_PALETTE];
		},
		async createPalette(user, input) {
			calls.push(["createPalette", user, input]);
			return { ...input, id: paletteId, builtIn: false };
		},
		async updatePalette(user, id, input) {
			calls.push(["updatePalette", user, id, input]);
			return { ...input, id, builtIn: false };
		},
		async deletePalette(...args) {
			calls.push(["deletePalette", ...args]);
		},
		...overrides,
	};
	const router = createAppRouter(
		undefined,
		undefined,
		undefined,
		undefined,
		appearance,
	);
	const user = { workosUserId: "workos-user-1" };

	return {
		calls,
		signedIn: router.createCaller(createTrpcContext({ database, user })),
		signedOut: router.createCaller(createTrpcContext({ database })),
		user,
	};
}

describe("appearance tRPC routes", () => {
	it("needs a signed-in reader for every procedure", async () => {
		const { signedOut } = createHarness();
		const unauthorized = { code: "UNAUTHORIZED" };

		await expect(signedOut.account.me()).rejects.toMatchObject(unauthorized);
		await expect(
			signedOut.preferences.update({ mode: "dark" }),
		).rejects.toMatchObject(unauthorized);
		await expect(signedOut.palettes.list()).rejects.toMatchObject(unauthorized);
		await expect(signedOut.palettes.create(sunset)).rejects.toMatchObject(
			unauthorized,
		);
		await expect(
			signedOut.palettes.update({ ...sunset, id: paletteId }),
		).rejects.toMatchObject(unauthorized);
		await expect(
			signedOut.palettes.delete({ id: paletteId }),
		).rejects.toMatchObject(unauthorized);
	});

	it("returns the account and passes validated changes to the service", async () => {
		const { calls, signedIn, user } = createHarness();

		expect(await signedIn.account.me()).toEqual(account);
		await signedIn.preferences.update({ mode: "dark", paletteId: "ember" });
		await signedIn.palettes.update({ ...sunset, id: paletteId });
		await signedIn.palettes.delete({ id: paletteId });

		expect(calls).toEqual([
			["getAccount", user],
			["updatePreferences", user, { mode: "dark", paletteId: "ember" }],
			["updatePalette", user, paletteId, sunset],
			["deletePalette", user, paletteId],
		]);
	});

	it("accepts only #RRGGBB colours, and stores them upper-cased", async () => {
		const { calls, signedIn, user } = createHarness();

		for (const baseColor of [
			"red",
			"#FFF",
			"#FFF6D5FF",
			"url(https://example.com/x)",
			"#FFF6D5; background: url(//example.com)",
		])
			await expect(
				signedIn.palettes.create({ ...sunset, baseColor }),
			).rejects.toMatchObject({ code: "BAD_REQUEST" });
		expect(calls).toEqual([]);

		await signedIn.palettes.create({ ...sunset, accentColor: "#7c3aed" });
		expect(calls).toEqual([["createPalette", user, sunset]]);
	});

	it("answers 404 for a palette the reader can't use and 400 at the limit", async () => {
		const { signedIn } = createHarness({
			async updatePreferences() {
				throw new PaletteNotFoundError();
			},
			async createPalette() {
				throw new PaletteLimitError();
			},
		});

		await expect(
			signedIn.preferences.update({ paletteId }),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
		await expect(signedIn.palettes.create(sunset)).rejects.toMatchObject({
			code: "BAD_REQUEST",
		});
	});
});
