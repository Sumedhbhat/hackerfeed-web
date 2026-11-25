import { fake, usePlaceholder } from "@autoskeleton/react";
import type { PaperEdition } from "@hackerfeed/entities/papers";
import { Button } from "@hackerfeed/ui/atoms/Button";
import { Icon } from "@hackerfeed/ui/atoms/Icon";
import { PaperFeedMessage } from "@hackerfeed/ui/molecules/PaperFeedMessage";
import { RefreshCw } from "lucide-react";
import {
	type PaperFilters,
	PapersFeed,
} from "#/components/organisms/papers/PapersFeed";
import { usePaperEdition } from "#/hooks/usePaperEdition";

const EDITION_PLACEHOLDER: PaperEdition = {
	editionDate: null,
	papers: fake.list(3, (i) => ({
		abstract: null,
		arxivId: `0000.0000${i}`,
		authors: [fake.name(i), fake.name(i + 1)],
		githubRepo: null,
		keywords: [],
		paperPublishedAt: fake.date(),
		paperUrl: "https://arxiv.org/",
		projectPage: null,
		summary: fake.sentence(40, i),
		title: fake.sentence(9, i),
		upvotes: 88,
		entryPublishedAt: fake.date(),
		rank: i + 1,
	})),
	popularKeywords: fake.list(6, (i) => ({
		keyword: fake.text(8, i),
		paperCount: 8,
		totalUpvotes: 88,
	})),
};

type PapersPageProps = {
	filters: PaperFilters;
	onFiltersChange: (filters: PaperFilters) => void;
};

export function PapersPage({ filters, onFiltersChange }: PapersPageProps) {
	const edition = usePaperEdition(filters.date);
	const { data, loading } = usePlaceholder(edition.data, EDITION_PLACEHOLDER);

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
			edition={data}
			loading={loading}
			filters={filters}
			onFiltersChange={onFiltersChange}
		/>
	);
}
