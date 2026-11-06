import type { PaperViewAction } from "@hackerfeed/contracts/view-activity";
import { Icon } from "@hackerfeed/ui/atoms/Icon";
import { PaperCard } from "@hackerfeed/ui/atoms/PaperCard";
import { ToggleButton } from "@hackerfeed/ui/atoms/Toggle";
import { ToggleLabel } from "@hackerfeed/ui/atoms/ToggleLabel";
import { PaperCardFooter } from "@hackerfeed/ui/molecules/PaperCardFooter";
import { PaperLinks } from "@hackerfeed/ui/molecules/PaperLinks";
import { PaperResourceLinks } from "@hackerfeed/ui/molecules/PaperResourceLinks";
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
			<PaperSignals
				authors={formatAuthors(paper.authors)}
				upvotes={paper.upvotes}
				publishedLabel={formatPaperDate(paper.paperPublishedAt)}
				topics={paper.keywords}
			/>
			<PaperSummary paper={paper} />
			<PaperCardFooter
				actions={
					<>
						<PaperLinks
							title={paper.title}
							paperUrl={paper.paperUrl}
							discussUrl={buildChatGptPaperDiscussionUrl(paper)}
							onRead={() => onView("read")}
							onDiscuss={() => onView("chat_opened")}
						/>
						<PaperResourceLinks
							title={paper.title}
							projectPage={paper.projectPage}
							githubRepo={paper.githubRepo}
						/>
					</>
				}
				save={
					canFavorite ? (
						<ToggleButton
							aria-label={`Save ${paper.title}`}
							pressed={saved}
							disabled={pending}
							onPressedChange={onToggleFavorite}
						>
							<Icon icon={Bookmark} filled={saved} />
							<ToggleLabel
								on={saved}
								offLabel="Save"
								onLabel="Saved"
								iconOnlyOnPhones
							/>
						</ToggleButton>
					) : null
				}
			/>
		</PaperCard>
	);
}
