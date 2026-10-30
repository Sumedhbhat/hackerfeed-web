import { Button } from "@hackerfeed/ui/atoms/Button";
import { Icon } from "@hackerfeed/ui/atoms/Icon";
import { PaperFeedMessage } from "@hackerfeed/ui/molecules/PaperFeedMessage";
import { PaperFeedSkeleton } from "@hackerfeed/ui/molecules/PaperFeedSkeleton";
import { RefreshCw } from "lucide-react";
import {
	type PaperFilters,
	PapersFeed,
} from "#/components/organisms/papers/PapersFeed";
import { usePaperEdition } from "#/hooks/usePaperEdition";

type PapersPageProps = {
	filters: PaperFilters;
	onFiltersChange: (filters: PaperFilters) => void;
};

export function PapersPage({ filters, onFiltersChange }: PapersPageProps) {
	const edition = usePaperEdition(filters.date);

	if (edition.isPending) return <PaperFeedSkeleton />;

	if (edition.isError) {
		return (
			<PaperFeedMessage
				standalone
				message="HackerFeed couldn't load this paper edition."
			>
				<Button variant="secondary" onClick={() => edition.refetch()}>
					<Icon icon={RefreshCw} /> Try again
				</Button>
			</PaperFeedMessage>
		);
	}

	return (
		<PapersFeed
			edition={edition.data}
			filters={filters}
			onFiltersChange={onFiltersChange}
		/>
	);
}
