import {
	type FeatureFlags,
	fetchFeatureFlags as fetchSessionFeatureFlags,
} from "@hackerfeed/api-client/feature-flags";
import { env } from "#/env";
import { getApiHeaders } from "#/lib/auth/authkit";

export type {
	FeatureFlagName,
	FeatureFlags,
} from "@hackerfeed/api-client/feature-flags";

export async function fetchFeatureFlags(): Promise<Partial<FeatureFlags>> {
	if (import.meta.env.VITE_DEMO_DATA === "true") return {};
	return fetchSessionFeatureFlags(env.VITE_API_URL, {
		getHeaders: getApiHeaders,
	});
}
