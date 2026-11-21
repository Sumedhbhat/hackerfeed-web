import { useQuery } from "@tanstack/react-query";
import { createTrpcClient } from "#/lib/trpc/client";
import { useAuthSession } from "./useAuthSession";

/** Every day the signed-in reader read something, on their own calendar. */
export function useReadingDays() {
	const { user } = useAuthSession();
	const utcOffsetMinutes = -new Date().getTimezoneOffset();

	return useQuery({
		queryKey: ["analytics", "reading-days", user?.id, utcOffsetMinutes],
		queryFn: () =>
			createTrpcClient().analytics.readingDays.query({ utcOffsetMinutes }),
		enabled: Boolean(user),
		meta: { notifyOnError: false },
	});
}
