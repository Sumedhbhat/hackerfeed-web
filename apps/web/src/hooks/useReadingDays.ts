import { useQuery } from "@tanstack/react-query";
import { createTrpcClient } from "#/lib/trpc/client";
import { useAuthSession } from "./useAuthSession";

export const READING_DAYS_KEY = ["analytics", "reading-days"] as const;

/** Every day the signed-in reader read something, on their own calendar. */
export function useReadingDays() {
	const { user } = useAuthSession();
	const { timeZone } = Intl.DateTimeFormat().resolvedOptions();

	return useQuery({
		queryKey: [...READING_DAYS_KEY, user?.id, timeZone],
		queryFn: () => createTrpcClient().analytics.readingDays.query({ timeZone }),
		enabled: Boolean(user),
		meta: { notifyOnError: false },
	});
}
