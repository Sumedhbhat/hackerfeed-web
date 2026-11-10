import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import {
	BUILT_IN_PALETTES,
	DEFAULT_PALETTE,
} from "@hackerfeed/contracts/appearance";
import { beforeEach, describe, expect, it } from "vitest";
import themeInit from "../theme-init.js?raw";
import {
	APPEARANCE_CACHE_KEY,
	appearanceStore,
	DEFAULT_APPEARANCE,
	DEFAULT_TOKENS,
	paletteTokens,
	readCachedAppearance,
	showAppearance,
} from "./appearance";
import { PALETTE_ROLES } from "./derive-palette";

const stylesheet = readFileSync(
	createRequire(import.meta.url).resolve("@hackerfeed/ui/styles.css"),
	"utf8",
);
const root = document.documentElement;
const ember = BUILT_IN_PALETTES[1];
const runThemeInit = () => new Function(themeInit)();

beforeEach(() => {
	root.removeAttribute("data-theme");
	root.removeAttribute("style");
	document.head.innerHTML = `
		<meta name="theme-color" data-scheme="light" content="">
		<meta name="theme-color" data-scheme="dark" content="">`;
	appearanceStore.setState(() => DEFAULT_APPEARANCE);
});

const themeColor = (scheme: string) =>
	document
		.querySelector(`meta[name="theme-color"][data-scheme="${scheme}"]`)
		?.getAttribute("content");

describe("the default palette", () => {
	it("lists the same colours as the stylesheet", () => {
		for (const role of PALETTE_ROLES) {
			const declared = stylesheet.match(
				new RegExp(`--${role}: light-dark\\((#\\w{6}), (#\\w{6})\\);`),
			);
			expect(declared?.slice(1), role).toEqual([
				DEFAULT_TOKENS.light[role],
				DEFAULT_TOKENS.dark[role],
			]);
		}
	});
});

describe("showAppearance", () => {
	it("overrides every colour role with the palette's light and dark pair", () => {
		showAppearance({ mode: "dark", palette: ember });

		const tokens = paletteTokens(ember);
		expect(root.getAttribute("data-theme")).toBe("dark");
		for (const role of PALETTE_ROLES)
			expect(root.style.getPropertyValue(`--${role}`)).toBe(
				`light-dark(${tokens.light[role]}, ${tokens.dark[role]})`,
			);
		expect(themeColor("light")).toBe(tokens.dark.page);
		expect(themeColor("dark")).toBe(tokens.dark.page);
		expect(appearanceStore.state.palette).toBe(ember);
	});

	it("hands the colours back to the stylesheet for the default palette", () => {
		showAppearance({ mode: "light", palette: ember });
		showAppearance({ mode: "auto", palette: DEFAULT_PALETTE });

		expect(root.hasAttribute("data-theme")).toBe(false);
		expect(root.style.getPropertyValue("--accent")).toBe("");
		expect(themeColor("light")).toBe(DEFAULT_TOKENS.light.page);
		expect(themeColor("dark")).toBe(DEFAULT_TOKENS.dark.page);
	});

	it("caches what it showed for the next visit", () => {
		showAppearance({ mode: "light", palette: ember });

		expect(readCachedAppearance()).toEqual({ mode: "light", palette: ember });
	});
});

describe("theme-init, before first paint", () => {
	it("repaints the cached mode and palette", () => {
		showAppearance({ mode: "dark", palette: ember });
		const shown = root.getAttribute("style");
		root.removeAttribute("style");
		root.removeAttribute("data-theme");

		runThemeInit();

		expect(root.getAttribute("data-theme")).toBe("dark");
		expect(root.getAttribute("style")).toBe(shown);
	});

	it("uses the mode this browser saved before accounts kept it", () => {
		window.localStorage.setItem("theme", "dark");

		runThemeInit();

		expect(root.getAttribute("data-theme")).toBe("dark");
	});

	it("ignores cached values that are not plain colours", () => {
		window.localStorage.setItem(
			APPEARANCE_CACHE_KEY,
			JSON.stringify({
				mode: "sideways",
				colors: {
					page: ["url(https://example.com/a)", "#000000"],
					"ink;x": ["#000000", "#FFFFFF"],
					accent: ["#112233", "#445566"],
				},
			}),
		);

		runThemeInit();

		expect(root.hasAttribute("data-theme")).toBe(false);
		expect(root.getAttribute("style")).toBe(
			"--accent: light-dark(#112233, #445566);",
		);
	});

	it("leaves the page alone when the cache is unreadable", () => {
		window.localStorage.setItem(APPEARANCE_CACHE_KEY, "{not json");

		expect(runThemeInit).not.toThrow();
		expect(root.hasAttribute("style")).toBe(false);
	});
});
