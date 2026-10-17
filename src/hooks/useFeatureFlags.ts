import { useQuery } from "@tanstack/react-query";
import {
	type FeatureFlagName,
	fetchFeatureFlags,
} from "#/lib/feature-flags/client";
import { useAuthSession } from "./useAuthSession";

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

export function useFeatureFlag(name: FeatureFlagName): boolean {
	return useFeatureFlags().data?.[name] === true;
}
