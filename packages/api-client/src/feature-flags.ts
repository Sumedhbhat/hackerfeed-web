import type { FeatureFlags } from "@hackerfeed/backend/api-types";
import { z } from "zod";
import type { ApiAuth } from "./auth";

export type { FeatureFlags };
export type FeatureFlagName = keyof FeatureFlags;

const featureFlagsResponseSchema = z.object({
	flags: z.record(z.string(), z.boolean()),
});

export async function fetchFeatureFlags(
	auth: Pick<ApiAuth, "getHeaders">,
): Promise<Partial<FeatureFlags>> {
	const response = await fetch("/api/feature-flags", {
		headers: { accept: "application/json", ...(await auth.getHeaders()) },
	});
	if (!response.ok) {
		throw new Error(`Feature flags request failed with ${response.status}`);
	}
	return featureFlagsResponseSchema.parse(await response.json()).flags;
}
