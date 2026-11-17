import { z } from "zod";

export const themeModeSchema = z.enum(["light", "dark", "auto"]);
export type ThemeMode = z.infer<typeof themeModeSchema>;

/** Only `#RRGGBB`: palette colours end up in CSS, so no other CSS text is accepted. */
export const hexColorSchema = z
	.string()
	.regex(/^#[0-9a-fA-F]{6}$/, "Use a colour like #1E6B52")
	.transform((value) => value.toUpperCase());

export const paletteBaseRoleSchema = z.enum(["background", "text"]);
export type PaletteBaseRole = z.infer<typeof paletteBaseRoleSchema>;

export const paletteColorsSchema = z.object({
	baseRole: paletteBaseRoleSchema,
	baseColor: hexColorSchema,
	accentColor: hexColorSchema,
});
export type PaletteColors = z.infer<typeof paletteColorsSchema>;

export const paletteInputSchema = paletteColorsSchema
	.extend({ name: z.string().trim().min(1).max(40) })
	.strict();
export type PaletteInput = z.infer<typeof paletteInputSchema>;

export const paletteIdInputSchema = z.object({ id: z.uuid() }).strict();
export const paletteUpdateInputSchema = paletteInputSchema
	.extend({ id: z.uuid() })
	.strict();

export const paletteSchema = paletteColorsSchema.extend({
	id: z.string(),
	name: z.string(),
	builtIn: z.boolean(),
});
export type Palette = z.infer<typeof paletteSchema>;
export const paletteListOutputSchema = z.array(paletteSchema);

export const DEFAULT_PALETTE = {
	id: "reading-room",
	name: "Reading room",
	baseRole: "background",
	baseColor: "#F6F7F4",
	accentColor: "#1E6B52",
	builtIn: true,
} as const satisfies Palette;

export const BUILT_IN_PALETTES: readonly Palette[] = [
	DEFAULT_PALETTE,
	{
		id: "ember",
		name: "Ember",
		baseRole: "background",
		baseColor: "#F9F7F4",
		accentColor: "#C25A28",
		builtIn: true,
	},
	{
		id: "iris",
		name: "Iris",
		baseRole: "background",
		baseColor: "#F8F7FC",
		accentColor: "#6D4AD9",
		builtIn: true,
	},
	{
		id: "midnight",
		name: "Midnight",
		baseRole: "background",
		baseColor: "#0F172A",
		accentColor: "#2BA3A3",
		builtIn: true,
	},
];

export const MAX_PALETTES_PER_USER = 24;

export const accountOutputSchema = z.object({
	preferences: z.object({
		mode: themeModeSchema,
		palette: paletteSchema,
		/** False until the reader first chooses something; the defaults are not stored. */
		saved: z.boolean(),
	}),
});
export type Account = z.infer<typeof accountOutputSchema>;
export type Preferences = Account["preferences"];

export const preferencesUpdateInputSchema = z
	.object({
		mode: themeModeSchema.optional(),
		paletteId: z.string().min(1).max(64).optional(),
	})
	.strict();
export type PreferencesUpdateInput = z.infer<
	typeof preferencesUpdateInputSchema
>;
