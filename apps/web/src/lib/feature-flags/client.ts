import {
	type FeatureFlags,
	fetchFeatureFlags as fetchSessionFeatureFlags,
} from "@hackerfeed/api-client/feature-flags";
import { getApiHeaders } from "#/lib/auth/authkit";

export type {
	FeatureFlagName,
	FeatureFlags,
} from "@hackerfeed/api-client/feature-flags";

export async function fetchFeatureFlags(): Promise<Partial<FeatureFlags>> {
	if (import.meta.env.VITE_DEMO_DATA === "true") return { aiChat: false };
	return fetchSessionFeatureFlags({ getHeaders: getApiHeaders });
}
