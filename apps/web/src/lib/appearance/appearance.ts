import {
	DEFAULT_PALETTE,
	type Palette,
	type PaletteColors,
	paletteSchema,
	type ThemeMode,
	themeModeSchema,
} from "@hackerfeed/contracts/appearance";
import { Store } from "@tanstack/store";
import { z } from "zod";
import {
	derivePalette,
	PALETTE_ROLES,
	type PaletteTokens,
	type Scheme,
} from "./derive-palette";

export type Appearance = { mode: ThemeMode; palette: Palette };
export type SchemeTokens = Record<Scheme, PaletteTokens>;

export const DEFAULT_APPEARANCE: Appearance = {
	mode: "auto",
	palette: DEFAULT_PALETTE,
};

/** The default palette is hand-tuned in the stylesheet; this is the same set of values. */
export const DEFAULT_TOKENS: SchemeTokens = {
	light: {
		page: "#F6F7F4",
		surface: "#FFFFFF",
		ink: "#15211C",
		"ink-soft": "#44514B",
		"ink-faint": "#5C6963",
		line: "#DDE3DF",
		muted: "#EDF1EE",
		"muted-line": "#C9D2CD",
		"field-line": "#7D8A84",
		accent: "#1E6B52",
		"accent-strong": "#14523E",
		"accent-tint": "#E4F0EA",
		"on-accent": "#FFFFFF",
		bookmark: "#94600F",
		"bookmark-tint": "#FBF3E2",
		"bookmark-tint-strong": "#F8ECD3",
		danger: "#A3322A",
	},
	dark: {
		page: "#0E1512",
		surface: "#151E1A",
		ink: "#E4EBE7",
		"ink-soft": "#A6B4AD",
		"ink-faint": "#8E9C95",
		line: "#25312B",
		muted: "#1C2722",
		"muted-line": "#33423B",
		"field-line": "#64746D",
		accent: "#62C29C",
		"accent-strong": "#86D6B5",
		"accent-tint": "#18322A",
		"on-accent": "#08130E",
		bookmark: "#E3B159",
		"bookmark-tint": "#221E17",
		"bookmark-tint-strong": "#3A3122",
		danger: "#F08A80",
	},
};

export function paletteTokens(
	palette: PaletteColors & { id?: string },
): SchemeTokens {
	return palette.id === DEFAULT_PALETTE.id
		? DEFAULT_TOKENS
		: derivePalette(palette);
}

/** Read before first paint by `theme-init.js`, which applies `mode` and `colors` itself. */
export const APPEARANCE_CACHE_KEY = "hackerfeed:appearance";
/** Where the mode lived before it was saved to the account. */
export const LEGACY_MODE_KEY = "theme";

const cacheSchema = z.object({ mode: themeModeSchema, palette: paletteSchema });

export function readCachedAppearance(): Appearance | null {
	try {
		const cached = window.localStorage.getItem(APPEARANCE_CACHE_KEY);
		return cached ? cacheSchema.parse(JSON.parse(cached)) : null;
	} catch {
		return null;
	}
}

export function readLegacyMode(): ThemeMode | null {
	try {
		const mode = themeModeSchema.safeParse(
			window.localStorage.getItem(LEGACY_MODE_KEY),
		);
		return mode.success ? mode.data : null;
	} catch {
		return null;
	}
}

export function forgetLegacyMode() {
	try {
		window.localStorage.removeItem(LEGACY_MODE_KEY);
	} catch {}
}

function applyAppearance({ mode, palette }: Appearance) {
	const root = document.documentElement;
	if (mode === "auto") root.removeAttribute("data-theme");
	else root.setAttribute("data-theme", mode);

	const isDefault = palette.id === DEFAULT_PALETTE.id;
	const tokens = paletteTokens(palette);
	for (const role of PALETTE_ROLES) {
		if (isDefault) root.style.removeProperty(`--${role}`);
		else
			root.style.setProperty(
				`--${role}`,
				`light-dark(${tokens.light[role]}, ${tokens.dark[role]})`,
			);
	}

	for (const scheme of ["light", "dark"] as const)
		document
			.querySelector(`meta[name="theme-color"][data-scheme="${scheme}"]`)
			?.setAttribute("content", tokens[mode === "auto" ? scheme : mode].page);

	try {
		window.localStorage.setItem(
			APPEARANCE_CACHE_KEY,
			JSON.stringify({
				mode,
				palette,
				colors: isDefault
					? null
					: Object.fromEntries(
							PALETTE_ROLES.map((role) => [
								role,
								[tokens.light[role], tokens.dark[role]],
							]),
						),
			}),
		);
	} catch {}
}

export const appearanceStore = new Store<Appearance>(DEFAULT_APPEARANCE);

/** Shows an appearance on this device: the page, the store and the first-paint cache. */
export function showAppearance(appearance: Appearance) {
	appearanceStore.setState(() => appearance);
	applyAppearance(appearance);
}
