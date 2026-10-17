import { useQuery } from "@tanstack/react-query";
import {
	type FeatureFlagName,
	fetchFeatureFlags,
} from "#/lib/feature-flags/client";
import { useAuthSession } from "./useAuthSession";

/**
 * The session's flags. Keyed by user so signing in or out fetches that
 * session's flags; `SessionGate` holds the app until the first answer.
 */
export function useFeatureFlags() {
	const { isLoading, user } = useAuthSession();
	return useQuery({
		queryKey: ["feature-flags", user?.id ?? null],
		queryFn: fetchFeatureFlags,
		enabled: !isLoading,
		staleTime: 5 * 60_000,
		retry: 1,
	});
}

/** Off until the server says on, including when the flags request fails. */
export function useFeatureFlag(name: FeatureFlagName): boolean {
	return useFeatureFlags().data?.[name] === true;
}
