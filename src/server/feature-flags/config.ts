import "@tanstack/react-start/server-only";

export type FeatureFlagDefinition = {
	/** What the flag gates and why it's off or on. */
	description: string;
	/** On for every visitor, signed in or not. */
	enabled: boolean;
	/**
	 * WorkOS user ids (`user_…`) that get the flag while `enabled` is false,
	 * e.g. to try a feature before turning it on for everyone.
	 */
	enabledForUserIds?: readonly string[];
};

/**
 * Every feature flag. Flags change only with a deploy: edit this object, then
 * ship. See `.claude/skills/feature-flags/SKILL.md` for adding and removing one.
 */
export const featureFlags = {
	aiChat: {
		description:
			"Chat about stories with your own ChatGPT subscription (/chat/:storyId, the Discuss links and the profile's AI apps card). Off until OpenAI approves HackerFeed's app access.",
		enabled: false,
	},
} satisfies Record<string, FeatureFlagDefinition>;

export type FeatureFlagName = keyof typeof featureFlags;
