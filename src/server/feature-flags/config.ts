import "@tanstack/react-start/server-only";

export type FeatureFlagDefinition = {
	description: string;
	enabled: boolean;
	enabledForUserIds?: readonly string[];
};

export const featureFlags = {
	aiChat: {
		description:
			"Chat about stories with your own ChatGPT subscription (/chat/:storyId, the Discuss links and the profile's AI apps card). Off until OpenAI approves HackerFeed's app access.",
		enabled: false,
	},
} satisfies Record<string, FeatureFlagDefinition>;

export type FeatureFlagName = keyof typeof featureFlags;
