import { Star } from "lucide-react";
import { Button } from "#/components/atoms/Button";
import { Icon } from "#/components/atoms/Icon";
import { PaperCard } from "#/components/atoms/PaperCard";
import { Text } from "#/components/atoms/Text";
import { KeywordList } from "#/components/molecules/KeywordList";
import { PaperCardFooter } from "#/components/molecules/PaperCardFooter";
import { PaperLinks } from "#/components/molecules/PaperLinks";
import { PaperSignals } from "#/components/molecules/PaperSignals";
import { PaperTitle } from "#/components/molecules/PaperTitle";
import {
	buildChatGptPaperDiscussionUrl,
	formatAuthors,
	formatPaperDate,
	type PaperPresentation,
} from "#/lib/papers/presentation";
import { PaperSummary } from "./PaperSummary";

type PaperRowProps = {
	canFavorite: boolean;
	index: number;
	isFavorited: boolean;
	isPending: boolean;
	onToggleFavorite: () => void;
	onView: () => void;
	paper: PaperPresentation;
};

export function PaperRow({
	canFavorite,
	index,
	isFavorited: saved,
	isPending: pending,
	onToggleFavorite,
	onView,
	paper,
}: PaperRowProps) {
	return (
		<PaperCard animationDelay={Math.min(index * 35, 210)}>
			<PaperTitle href={paper.paperUrl} onClick={onView}>
				{paper.title}
			</PaperTitle>
			<Text size="xs" tone="soft">
				{formatAuthors(paper.authors)}
			</Text>
			<PaperSummary paper={paper} />
			<PaperCardFooter
				signals={
					<PaperSignals
						upvotes={paper.upvotes}
						publishedLabel={formatPaperDate(paper.paperPublishedAt)}
						hasCode={Boolean(paper.githubRepo)}
					/>
				}
				actions={
					<>
						<PaperLinks
							title={paper.title}
							discussUrl={buildChatGptPaperDiscussionUrl(paper)}
							projectPage={paper.projectPage}
							githubRepo={paper.githubRepo}
						/>
						{canFavorite ? (
							<Button
								variant="ghost"
								aria-label={
									saved
										? `Remove ${paper.title} from favorites`
										: `Save ${paper.title} to favorites`
								}
								aria-pressed={saved}
								title={saved ? "Remove from favorites" : "Save to favorites"}
								disabled={pending}
								onClick={onToggleFavorite}
							>
								<Icon icon={Star} filled={saved} pop={saved} />{" "}
								{saved ? "Saved" : "Save"}
							</Button>
						) : null}
					</>
				}
				keywords={
					paper.keywords.length > 0 ? (
						<KeywordList
							keywords={paper.keywords}
							aria-label="Paper keywords"
						/>
					) : null
				}
			/>
		</PaperCard>
	);
}
