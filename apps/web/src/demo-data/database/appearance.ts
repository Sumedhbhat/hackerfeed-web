import type {
	palettes,
	userPreferences,
} from "@hackerfeed/backend/database/schema";
import { sqliteAt } from "../defaults";
import { demoUser } from "./app-users";

type PaletteRow = typeof palettes.$inferSelect;
type UserPreferencesRow = typeof userPreferences.$inferSelect;

export const paletteRows: PaletteRow[] = [
	{
		id: "0b7f3c52-6a1e-4d0b-9c58-2f4a6e8d1c30",
		appUserId: demoUser.id,
		name: "Sunset",
		baseRole: "background",
		baseColor: "#FFF6D5",
		accentColor: "#7C3AED",
		createdAt: sqliteAt("09:00:00"),
		updatedAt: sqliteAt("09:00:00"),
	},
];

/** Empty on purpose: the demo reader has not chosen yet, so previews open on the defaults. */
export const userPreferencesRows: UserPreferencesRow[] = [];
