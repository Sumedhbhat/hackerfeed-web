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
	// Demo builds have no AI backend; the e2e build turns chat on and fakes it.
	if (import.meta.env.VITE_DEMO_DATA === "true") {
		return { aiChat: import.meta.env.VITE_DEMO_AI_CHAT === "true" };
	}
	return fetchSessionFeatureFlags({ getHeaders: getApiHeaders });
}
