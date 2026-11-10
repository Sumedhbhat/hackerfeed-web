import type { PaletteColors } from "@hackerfeed/contracts/appearance";
import {
	clampChroma,
	formatHex,
	interpolate,
	modeLrgb,
	modeOklab,
	modeOklch,
	modeRgb,
	type Oklch,
	useMode as registerMode,
	wcagContrast,
} from "culori/fn";

const toOklch = registerMode(modeOklch);
registerMode(modeRgb);
registerMode(modeOklab);
registerMode(modeLrgb);

export const PALETTE_ROLES = [
	"paper",
	"surface",
	"ink",
	"ink-soft",
	"ink-faint",
	"line",
	"muted",
	"muted-line",
	"field-line",
	"accent",
	"accent-strong",
	"accent-tint",
	"on-accent",
	"bookmark",
	"bookmark-tint",
	"bookmark-tint-strong",
	"danger",
] as const;
export type PaletteRole = (typeof PALETTE_ROLES)[number];
export type PaletteTokens = Record<PaletteRole, string>;
export type Scheme = "light" | "dark";
export type DerivedPalette = Record<Scheme, PaletteTokens> & {
	notes: string[];
};

const TEXT_TARGET = 15;
const BASE_MIN = 10;
const READABLE = 4.5;
const BOUNDARY = 3;
const SOFT_ON_PAPER = 7.5;
const FAINT_ON_PAPER = 5.3;
const FIELD_LINE_ON_PAPER = 3.3;

const SCHEME = {
	light: {
		paperL: 0.975,
		paperC: 0.03,
		midBackgroundL: 0.975,
		midTextL: 0.235,
		towards: 0,
		surfaceLift: 0.03,
		muted: 0.03,
		line: 0.09,
		mutedLine: 0.16,
		accentOnPaper: 5.5,
		strongShift: -0.08,
		accentTint: 0.08,
		bookmark: { mode: "oklch", l: 0.533, c: 0.11, h: 71 },
		bookmarkTint: 0.06,
		bookmarkTintStrong: 0.1,
		danger: { mode: "oklch", l: 0.485, c: 0.15, h: 28 },
	},
	dark: {
		paperL: 0.187,
		paperC: 0.02,
		midBackgroundL: 0.187,
		midTextL: 0.934,
		towards: 1,
		surfaceLift: 0.038,
		muted: 0.1,
		line: 0.15,
		mutedLine: 0.235,
		accentOnPaper: 7.5,
		strongShift: 0.07,
		accentTint: 0.2,
		bookmark: { mode: "oklch", l: 0.789, c: 0.121, h: 80 },
		bookmarkTint: 0.09,
		bookmarkTintStrong: 0.22,
		danger: { mode: "oklch", l: 0.74, c: 0.126, h: 26 },
	},
} as const;

const INK_CHROMA = 0.015;

const hex = (color: Oklch) => formatHex(clampChroma(color, "oklch"));
const withL = (color: Oklch, l: number) =>
	hex({ ...color, l: Math.min(1, Math.max(0, l)) });
const mix = (from: string, to: string, amount: number) =>
	formatHex(interpolate([from, to], "oklab")(amount));
const worstContrast = (color: string, backgrounds: string[]) =>
	Math.min(...backgrounds.map((background) => wcagContrast(color, background)));

/**
 * The colour closest to `color` in lightness that `passes`, moving towards
 * black (0) or white (1). When even the extreme falls short, the extreme is
 * the best there is.
 */
function reach(
	color: Oklch,
	passes: (candidate: string) => boolean,
	towards: 0 | 1,
) {
	if (!passes(withL(color, towards))) return withL(color, towards);
	let near = color.l;
	let far: number = towards;
	for (let step = 0; step < 20; step++) {
		const middle = (near + far) / 2;
		if (passes(withL(color, middle))) far = middle;
		else near = middle;
	}
	return withL(color, far);
}

/** The least `ink` mixed into `paper` that `passes`. */
function leastMix(
	paper: string,
	ink: string,
	passes: (candidate: string) => boolean,
) {
	let low = 0;
	let high = 1;
	for (let step = 0; step < 20; step++) {
		const middle = (low + high) / 2;
		if (passes(mix(paper, ink, middle))) high = middle;
		else low = middle;
	}
	return mix(paper, ink, high);
}

const isLight = (color: string) =>
	wcagContrast(color, "#000000") >= wcagContrast(color, "#FFFFFF");

function deriveScheme(
	scheme: Scheme,
	paper: string,
	ink: string,
	accentInput: Oklch,
) {
	const s = SCHEME[scheme];
	const paperColor = toOklch(paper) as Oklch;
	const surface = withL(paperColor, paperColor.l + s.surfaceLift);
	const muted = mix(paper, ink, s.muted);
	const plain = [paper, surface, muted];
	const readableOn = (backgrounds: string[]) => (candidate: string) =>
		worstContrast(candidate, backgrounds) >= READABLE;

	const firstAccent = reach(accentInput, readableOn(plain), s.towards);
	const accentTint = mix(paper, firstAccent, s.accentTint);
	const firstBookmark = reach(s.bookmark, readableOn(plain), s.towards);
	const bookmarkTint = mix(paper, firstBookmark, s.bookmarkTint);
	const bookmarkTintStrong = mix(paper, firstBookmark, s.bookmarkTintStrong);

	const backgrounds = [...plain, accentTint, bookmarkTint];
	const readable = readableOn(backgrounds);
	const comfortable = (onPaper: number) => (candidate: string) =>
		readable(candidate) && wcagContrast(candidate, paper) >= onPaper;
	const keepOrAdjust = (
		color: Oklch,
		passes: (candidate: string) => boolean,
		adjusted: (candidate: string) => boolean,
	) => (passes(hex(color)) ? hex(color) : reach(color, adjusted, s.towards));

	const accent = keepOrAdjust(
		accentInput,
		readable,
		comfortable(s.accentOnPaper),
	);
	const accentColor = toOklch(accent) as Oklch;
	const onSavedTints = (candidate: string) =>
		readable(candidate) &&
		wcagContrast(candidate, bookmarkTintStrong) >= READABLE;

	const tokens: PaletteTokens = {
		paper,
		surface,
		ink,
		"ink-soft": leastMix(paper, ink, comfortable(SOFT_ON_PAPER)),
		"ink-faint": leastMix(paper, ink, comfortable(FAINT_ON_PAPER)),
		line: mix(paper, ink, s.line),
		muted,
		"muted-line": mix(paper, ink, s.mutedLine),
		"field-line": leastMix(
			paper,
			ink,
			(candidate) =>
				worstContrast(candidate, plain) >= BOUNDARY &&
				wcagContrast(candidate, paper) >= FIELD_LINE_ON_PAPER,
		),
		accent,
		"accent-strong": withL(accentColor, accentColor.l + s.strongShift),
		"accent-tint": accentTint,
		"on-accent":
			wcagContrast(surface, accent) >= wcagContrast(paper, accent)
				? surface
				: paper,
		bookmark: keepOrAdjust(s.bookmark, onSavedTints, onSavedTints),
		"bookmark-tint": bookmarkTint,
		"bookmark-tint-strong": bookmarkTintStrong,
		danger: keepOrAdjust(s.danger, readable, comfortable(FAINT_ON_PAPER)),
	};

	return { tokens, accentAdjusted: accent !== hex(accentInput) };
}

export function derivePalette({
	baseRole,
	baseColor,
	accentColor,
}: PaletteColors): DerivedPalette {
	const notes: string[] = [];
	const accent = toOklch(accentColor) as Oklch;
	let base = toOklch(baseColor) as Oklch;
	let ownScheme: Scheme =
		isLight(baseColor) === (baseRole === "background") ? "light" : "dark";

	if (
		Math.max(
			wcagContrast(baseColor, "#000000"),
			wcagContrast(baseColor, "#FFFFFF"),
		) < BASE_MIN
	) {
		ownScheme = "light";
		base = {
			...base,
			l:
				baseRole === "background"
					? SCHEME.light.midBackgroundL
					: SCHEME.light.midTextL,
		};
		notes.push(
			`${baseRole === "background" ? "Background" : "Text"} ${baseColor} is too mid-tone to read against, so its lightness was changed and its hue kept.`,
		);
	}

	const hueless = base.h === undefined;
	const inkFor = (paper: Oklch, scheme: Scheme) =>
		reach(
			{ ...paper, c: hueless ? 0 : INK_CHROMA },
			(candidate) => wcagContrast(candidate, hex(paper)) >= TEXT_TARGET,
			SCHEME[scheme].towards,
		);
	const paperFor = (scheme: Scheme): Oklch => ({
		...base,
		l: SCHEME[scheme].paperL,
		c: Math.min(base.c, SCHEME[scheme].paperC),
	});

	const pairs = {} as Record<Scheme, { paper: string; ink: string }>;
	for (const scheme of ["light", "dark"] as const) {
		if (scheme !== ownScheme) {
			const paper = paperFor(scheme);
			pairs[scheme] = { paper: hex(paper), ink: inkFor(paper, scheme) };
		} else if (baseRole === "background") {
			pairs[scheme] = { paper: hex(base), ink: inkFor(base, scheme) };
		} else {
			const ink = hex(base);
			pairs[scheme] = {
				ink,
				paper: reach(
					{ ...base, c: Math.min(base.c, SCHEME[scheme].paperC) },
					(candidate) => wcagContrast(candidate, ink) >= TEXT_TARGET,
					scheme === "light" ? 1 : 0,
				),
			};
		}
	}

	const light = deriveScheme(
		"light",
		pairs.light.paper,
		pairs.light.ink,
		accent,
	);
	const dark = deriveScheme("dark", pairs.dark.paper, pairs.dark.ink, accent);
	if (light.accentAdjusted)
		notes.push("The accent was darkened in light mode so it stays readable.");
	if (dark.accentAdjusted)
		notes.push("The accent was lightened in dark mode so it stays readable.");

	return { light: light.tokens, dark: dark.tokens, notes };
}

export type ContrastCheck = {
	scheme: Scheme;
	text: PaletteRole;
	on: PaletteRole;
	ratio: number;
	minimum: number;
};

const BACKGROUND_ROLES = [
	"paper",
	"surface",
	"muted",
	"accent-tint",
	"bookmark-tint",
] as const;
const TEXT_ROLES = [
	"ink",
	"ink-soft",
	"ink-faint",
	"accent",
	"accent-strong",
	"bookmark",
	"danger",
] as const;

/** Every pair the UI relies on, with the WCAG minimum it has to meet. */
export function contrastChecks(palette: DerivedPalette): ContrastCheck[] {
	const checks: ContrastCheck[] = [];
	for (const scheme of ["light", "dark"] as const) {
		const tokens = palette[scheme];
		const add = (text: PaletteRole, on: PaletteRole, minimum: number) =>
			checks.push({
				scheme,
				text,
				on,
				ratio: wcagContrast(tokens[text], tokens[on]),
				minimum,
			});
		for (const on of BACKGROUND_ROLES)
			for (const text of TEXT_ROLES) add(text, on, READABLE);
		for (const on of ["paper", "surface", "muted"] as const)
			add("field-line", on, BOUNDARY);
		add("bookmark", "bookmark-tint-strong", READABLE);
		add("on-accent", "accent", READABLE);
		add("on-accent", "accent-strong", READABLE);
	}
	return checks;
}
