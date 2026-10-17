import { z } from "zod";
import { getAuthHeaders } from "#/lib/auth/authkit";
import type { FeatureFlags } from "#/server/feature-flags/service";

export type { FeatureFlags };
export type FeatureFlagName = keyof FeatureFlags;

const featureFlagsResponseSchema = z.object({
	flags: z.record(z.string(), z.boolean()),
});

export async function fetchFeatureFlags(): Promise<Partial<FeatureFlags>> {
	const response = await fetch("/api/feature-flags", {
		headers: { accept: "application/json", ...(await getAuthHeaders()) },
	});
	if (!response.ok) {
		throw new Error(`Feature flags request failed with ${response.status}`);
	}
	return featureFlagsResponseSchema.parse(await response.json()).flags;
}
