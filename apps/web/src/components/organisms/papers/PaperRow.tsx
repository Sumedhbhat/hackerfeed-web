import type { PaperViewAction } from "@hackerfeed/contracts/view-activity";
import { Icon } from "@hackerfeed/ui/atoms/Icon";
import { PaperCard } from "@hackerfeed/ui/atoms/PaperCard";
import { Text } from "@hackerfeed/ui/atoms/Text";
import { ToggleButton } from "@hackerfeed/ui/atoms/Toggle";
import { KeywordList } from "@hackerfeed/ui/molecules/KeywordList";
import { PaperCardFooter } from "@hackerfeed/ui/molecules/PaperCardFooter";
import { PaperLinks } from "@hackerfeed/ui/molecules/PaperLinks";
import { PaperSignals } from "@hackerfeed/ui/molecules/PaperSignals";
import { PaperTitle } from "@hackerfeed/ui/molecules/PaperTitle";
import { Bookmark } from "lucide-react";
import {
	buildChatGptPaperDiscussionUrl,
	formatAuthors,
	formatPaperDate,
	type PaperPresentation,
} from "#/lib/papers/presentation";
import { PaperSummary } from "./PaperSummary";

type PaperRowProps = {
	canFavorite: boolean;
	isFavorited: boolean;
	isPending: boolean;
	onToggleFavorite: () => void;
	onView: (action: PaperViewAction) => void;
	paper: PaperPresentation;
};

export function PaperRow({
	canFavorite,
	isFavorited: saved,
	isPending: pending,
	onToggleFavorite,
	onView,
	paper,
}: PaperRowProps) {
	return (
		<PaperCard saved={saved}>
			<PaperTitle href={paper.paperUrl} onClick={() => onView("read")}>
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
							onDiscuss={() => onView("chat_opened")}
						/>
						{canFavorite ? (
							<ToggleButton
								aria-label={`Save ${paper.title} to favorites`}
								pressed={saved}
								title={saved ? "Remove from favorites" : "Save to favorites"}
								disabled={pending}
								onPressedChange={onToggleFavorite}
							>
								<Icon icon={Bookmark} filled={saved} />
								{saved ? "Saved" : "Save"}
							</ToggleButton>
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
