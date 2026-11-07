import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createTrpcClient } from "#/lib/trpc/client";

export function usePaperEdition(editionDate?: string) {
	return useQuery({
		queryKey: ["papers", "edition", editionDate ?? "latest"],
		queryFn: () => createTrpcClient().papers.edition.query({ editionDate }),
		// Keep showing the current edition while another day loads, so the date
		// field and its focus stay put.
		placeholderData: keepPreviousData,
	});
}
