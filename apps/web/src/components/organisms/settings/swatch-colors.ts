import type { PaletteColors } from "@hackerfeed/contracts/appearance";
import type { SwatchColors } from "@hackerfeed/ui/atoms/PaletteSwatch";
import { paletteTokens } from "#/lib/appearance/appearance";
import type { PaletteTokens } from "#/lib/appearance/derive-palette";

const pick = (tokens: PaletteTokens): SwatchColors => ({
	paper: tokens.paper,
	surface: tokens.surface,
	ink: tokens.ink,
	inkSoft: tokens["ink-soft"],
	line: tokens.line,
	accent: tokens.accent,
	onAccent: tokens["on-accent"],
});

export function swatchColors(palette: PaletteColors & { id?: string }) {
	const tokens = paletteTokens(palette);
	return { light: pick(tokens.light), dark: pick(tokens.dark) };
}
