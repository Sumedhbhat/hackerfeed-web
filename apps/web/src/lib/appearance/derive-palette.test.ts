import {
	BUILT_IN_PALETTES,
	type PaletteColors,
} from "@hackerfeed/contracts/appearance";
import { describe, expect, it } from "vitest";
import { contrastChecks, derivePalette, PALETTE_ROLES } from "./derive-palette";

function failures(colors: PaletteColors) {
	return contrastChecks(derivePalette(colors))
		.filter((check) => check.ratio < check.minimum)
		.map(
			(check) =>
				`${check.scheme} ${check.text} on ${check.on}: ${check.ratio.toFixed(2)}`,
		);
}

const hexByte = (value: number) =>
	Math.floor(value * 256)
		.toString(16)
		.padStart(2, "0");

function seededColors(count: number) {
	let seed = 20261110;
	const random = () => {
		seed = (seed * 1664525 + 1013904223) % 2 ** 32;
		return seed / 2 ** 32;
	};
	const color = () =>
		`#${hexByte(random())}${hexByte(random())}${hexByte(random())}`.toUpperCase();
	return Array.from(
		{ length: count },
		(): PaletteColors => ({
			baseRole: random() < 0.5 ? "background" : "text",
			baseColor: color(),
			accentColor: color(),
		}),
	);
}

describe("derivePalette", () => {
	it.each([
		...BUILT_IN_PALETTES,
		{ baseRole: "text", baseColor: "#1C1A18", accentColor: "#C25A28" },
		{ baseRole: "background", baseColor: "#FFF6D5", accentColor: "#7C3AED" },
		{ baseRole: "text", baseColor: "#E8F0E4", accentColor: "#4CAF50" },
		{ baseRole: "background", baseColor: "#FFFFFF", accentColor: "#FFD43B" },
		{ baseRole: "background", baseColor: "#000000", accentColor: "#000000" },
		{ baseRole: "background", baseColor: "#C25A28", accentColor: "#2563EB" },
	] satisfies PaletteColors[])(
		"keeps every pair readable for $baseRole $baseColor with $accentColor",
		(colors) => {
			expect(failures(colors)).toEqual([]);
		},
	);

	it("keeps every pair readable for arbitrary inputs", () => {
		for (const colors of seededColors(400))
			expect(failures(colors), JSON.stringify(colors)).toEqual([]);
	});

	it("returns a #RRGGBB value for every role in both modes", () => {
		const palette = derivePalette(BUILT_IN_PALETTES[1]);
		for (const scheme of ["light", "dark"] as const)
			for (const role of PALETTE_ROLES)
				expect(palette[scheme][role]).toMatch(/^#[0-9a-f]{6}$/);
	});

	it("uses the picked colours unchanged when they already read well", () => {
		const palette = derivePalette({
			baseRole: "background",
			baseColor: "#FFF6D5",
			accentColor: "#7C3AED",
		});
		expect(palette.light.page).toBe("#fff6d5");
		expect(palette.light.accent).toBe("#7c3aed");
		expect(palette.notes).toEqual([
			"The accent was lightened in dark mode so it stays readable.",
		]);
	});

	it("puts a picked text colour in the mode it belongs to", () => {
		const palette = derivePalette({
			baseRole: "text",
			baseColor: "#E8F0E4",
			accentColor: "#4CAF50",
		});
		expect(palette.dark.ink).toBe("#e8f0e4");
	});

	it("keeps the hue of a mid-tone background and says so", () => {
		const palette = derivePalette({
			baseRole: "background",
			baseColor: "#C25A28",
			accentColor: "#2563EB",
		});
		expect(palette.light.page).not.toBe("#c25a28");
		expect(palette.notes[0]).toContain("too mid-tone");
	});
});
