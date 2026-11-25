import {
	BUILT_IN_PALETTES,
	DEFAULT_PALETTE,
	MAX_PALETTES_PER_USER,
} from "@hackerfeed/entities/appearance";
import { describe, expect } from "vitest";
import { palettes, userPreferences } from "../database/schema";
import { appUserIdOf } from "./support/seed";
import { INTEGRATION, test } from "./support/test";
import { SUNSET as sunset } from "./support/world";

const unknownPaletteId = "3f0e7c0a-5b0e-4f43-9d0b-1c2d3e4f5a6b";

describe("appearance access", () => {
	test(
		"needs a signed-in reader for every procedure",
		INTEGRATION,
		async ({ api }) => {
			for (const [path, method] of [
				["account.me", "GET"],
				["palettes.list", "GET"],
				["preferences.update", "POST"],
				["palettes.create", "POST"],
				["palettes.update", "POST"],
				["palettes.delete", "POST"],
			]) {
				const response = await api.request(`/api/trpc/${path}`, { method });
				expect(response.status).toBe(401);
			}
		},
	);
});

describe("preferences", () => {
	test(
		"answer with the defaults, unsaved, for a reader who never chose",
		INTEGRATION,
		async ({ api, database }) => {
			expect(await api.as("user_reader").account.me.query()).toEqual({
				preferences: {
					mode: "auto",
					palette: DEFAULT_PALETTE,
					chatProvider: "chatgpt",
					saved: false,
				},
			});
			expect(await database.select().from(userPreferences).all()).toEqual([]);
		},
	);

	test(
		"save a mode without touching the palette, and the other way round",
		INTEGRATION,
		async ({ api }) => {
			const reader = api.as("user_reader");

			await reader.preferences.update.mutate({ paletteId: "ember" });
			const account = await reader.preferences.update.mutate({ mode: "dark" });

			expect(account.preferences).toMatchObject({
				mode: "dark",
				palette: { id: "ember", builtIn: true },
				chatProvider: "chatgpt",
				saved: true,
			});
			expect(await reader.account.me.query()).toEqual(account);
		},
	);

	test(
		"save a chat provider without touching the look",
		INTEGRATION,
		async ({ api }) => {
			const reader = api.as("user_reader");

			await reader.preferences.update.mutate({ mode: "dark" });
			const account = await reader.preferences.update.mutate({
				chatProvider: "claude",
			});

			expect(account.preferences).toEqual({
				mode: "dark",
				palette: DEFAULT_PALETTE,
				chatProvider: "claude",
				saved: true,
			});
		},
	);

	test(
		"are each reader's own",
		INTEGRATION,
		async ({ world: { alice, bob } }) => {
			await bob.client.preferences.update.mutate({ mode: "auto" });

			expect((await alice.client.account.me.query()).preferences).toEqual({
				mode: "dark",
				palette: { ...sunset, id: alice.paletteId, builtIn: false },
				chatProvider: "claude",
				saved: true,
			});
			expect((await bob.client.account.me.query()).preferences).toMatchObject({
				mode: "auto",
				palette: { id: "ember", builtIn: true },
				chatProvider: "chatgpt",
			});
		},
	);

	test(
		"answer NOT_FOUND for a palette the reader can't use",
		INTEGRATION,
		async ({ api }) => {
			await expect(
				api
					.as("user_reader")
					.preferences.update.mutate({ paletteId: unknownPaletteId }),
			).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });
		},
	);
});

describe("palettes", () => {
	test(
		"list the built-in palettes, then the reader's own",
		INTEGRATION,
		async ({ world: { alice, bob } }) => {
			expect(await alice.client.palettes.list.query()).toEqual([
				...BUILT_IN_PALETTES,
				{ ...sunset, id: alice.paletteId, builtIn: false },
			]);
			expect(await bob.client.palettes.list.query()).toEqual(BUILT_IN_PALETTES);
		},
	);

	test(
		"accept only #RRGGBB colours, and store them upper-cased",
		INTEGRATION,
		async ({ api, database }) => {
			const reader = api.as("user_reader");

			for (const baseColor of [
				"red",
				"#FFF",
				"#FFF6D5FF",
				"url(https://example.com/x)",
				"#FFF6D5; background: url(//example.com)",
			])
				await expect(
					reader.palettes.create.mutate({ ...sunset, baseColor }),
				).rejects.toMatchObject({ data: { code: "BAD_REQUEST" } });
			expect(await database.select().from(palettes).all()).toEqual([]);

			const created = await reader.palettes.create.mutate({
				...sunset,
				accentColor: "#7c3aed",
			});
			expect(created).toMatchObject(sunset);
			expect(await database.select().from(palettes).all()).toMatchObject([
				{ accentColor: "#7C3AED" },
			]);
		},
	);

	test(
		"can be renamed and recoloured by their owner",
		INTEGRATION,
		async ({ api }) => {
			const reader = api.as("user_reader");
			const created = await reader.palettes.create.mutate(sunset);
			const dusk = { ...sunset, name: "Dusk", baseRole: "text" as const };

			expect(
				await reader.palettes.update.mutate({ ...dusk, id: created.id }),
			).toEqual({ ...dusk, id: created.id, builtIn: false });
			expect((await reader.palettes.list.query()).at(-1)).toEqual({
				...dusk,
				id: created.id,
				builtIn: false,
			});
		},
	);

	test(
		"can't be selected, changed or removed by someone else",
		INTEGRATION,
		async ({ world: { alice, bob } }) => {
			const theirs = alice.paletteId ?? "";

			await expect(
				bob.client.preferences.update.mutate({ paletteId: theirs }),
			).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });
			await expect(
				bob.client.palettes.update.mutate({
					...sunset,
					name: "Mine",
					id: theirs,
				}),
			).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });
			await bob.client.palettes.delete.mutate({ id: theirs });

			expect((await alice.client.account.me.query()).preferences).toMatchObject(
				{
					palette: { ...sunset, id: theirs, builtIn: false },
				},
			);
		},
	);

	test(
		"fall back to the default when the selected one is deleted",
		INTEGRATION,
		async ({ world: { alice } }) => {
			await alice.client.palettes.delete.mutate({ id: alice.paletteId ?? "" });

			expect((await alice.client.account.me.query()).preferences).toEqual({
				mode: "dark",
				palette: DEFAULT_PALETTE,
				chatProvider: "claude",
				saved: true,
			});
		},
	);

	test(
		"stop at the palette limit with BAD_REQUEST",
		INTEGRATION,
		async ({ api, database }) => {
			const reader = api.as("user_reader");
			await reader.account.me.query();
			const owner = await appUserIdOf(database, "user_reader");
			const [first, ...rest] = Array.from(
				{ length: MAX_PALETTES_PER_USER },
				() => database.insert(palettes).values({ ...sunset, appUserId: owner }),
			);
			if (first) await database.batch([first, ...rest]);

			await expect(reader.palettes.create.mutate(sunset)).rejects.toMatchObject(
				{ data: { code: "BAD_REQUEST" } },
			);
			await api.as("user_stranger").palettes.create.mutate(sunset);
		},
	);
});
