import type { FeatureFlags } from "@hackerfeed/backend/api-types";
import { z } from "zod";
import type { ApiAuth } from "./auth";

export type { FeatureFlags };
export type FeatureFlagName = keyof FeatureFlags;

const featureFlagsResponseSchema = z.object({
	flags: z.record(z.string(), z.boolean()),
});

export async function fetchFeatureFlags(
	apiUrl: string,
	auth: Pick<ApiAuth, "getHeaders">,
): Promise<Partial<FeatureFlags>> {
	const response = await fetch(new URL("/api/feature-flags", apiUrl), {
		headers: { accept: "application/json", ...(await auth.getHeaders()) },
	});
	if (!response.ok) {
		throw new Error(`Feature flags request failed with ${response.status}`);
	}
	return featureFlagsResponseSchema.parse(await response.json()).flags;
}
