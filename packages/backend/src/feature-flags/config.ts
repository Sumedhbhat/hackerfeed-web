import "@tanstack/react-start/server-only";

export type FeatureFlagDefinition = {
	description: string;
	enabled: boolean;
	enabledForUserIds?: readonly string[];
};

export const featureFlags = {} satisfies Record<string, FeatureFlagDefinition>;

export type FeatureFlagName = keyof typeof featureFlags;
