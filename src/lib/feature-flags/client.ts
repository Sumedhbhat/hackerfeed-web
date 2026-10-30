import type { FeatureFlags } from "@hackerfeed/backend/api-types";
import { z } from "zod";
import { getApiHeaders } from "#/lib/auth/authkit";

export type { FeatureFlags };
export type FeatureFlagName = keyof FeatureFlags;

const featureFlagsResponseSchema = z.object({
	flags: z.record(z.string(), z.boolean()),
});

export async function fetchFeatureFlags(): Promise<Partial<FeatureFlags>> {
	if (import.meta.env.VITE_DEMO_DATA === "true") return { aiChat: false };
	const response = await fetch("/api/feature-flags", {
		headers: { accept: "application/json", ...(await getApiHeaders()) },
	});
	if (!response.ok) {
		throw new Error(`Feature flags request failed with ${response.status}`);
	}
	return featureFlagsResponseSchema.parse(await response.json()).flags;
}
