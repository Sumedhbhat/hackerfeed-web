import "@tanstack/react-start/server-only";

import type { AuthenticatedWorkosUser } from "#/server/auth/current-user";
import {
	type FeatureFlagDefinition,
	type FeatureFlagName,
	featureFlags,
} from "./config";

export type FeatureFlags = Record<FeatureFlagName, boolean>;

type FeatureFlagConfig = Record<FeatureFlagName, FeatureFlagDefinition>;

function isOn(
	flag: FeatureFlagDefinition,
	user: AuthenticatedWorkosUser | null,
): boolean {
	if (flag.enabled) return true;
	return user !== null && !!flag.enabledForUserIds?.includes(user.workosUserId);
}

export function isFeatureEnabled(
	name: FeatureFlagName,
	user: AuthenticatedWorkosUser | null,
	config: FeatureFlagConfig = featureFlags,
): boolean {
	return isOn(config[name], user);
}

/** Every flag's value for this visitor (`null` when signed out). */
export function evaluateFeatureFlags(
	user: AuthenticatedWorkosUser | null,
	config: FeatureFlagConfig = featureFlags,
): FeatureFlags {
	return Object.fromEntries(
		Object.entries(config).map(([name, flag]) => [name, isOn(flag, user)]),
	) as FeatureFlags;
}
