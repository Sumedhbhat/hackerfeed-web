import { CHAT_PROVIDERS } from "@hackerfeed/entities/chat-providers";
import type { PaperViewAction } from "@hackerfeed/entities/view-activity";
import { Icon } from "@hackerfeed/ui/atoms/Icon";
import { PaperCard } from "@hackerfeed/ui/atoms/PaperCard";
import { Stack } from "@hackerfeed/ui/atoms/Stack";
import { ToggleButton } from "@hackerfeed/ui/atoms/Toggle";
import { ToggleLabel } from "@hackerfeed/ui/atoms/ToggleLabel";
import { ChatLink } from "@hackerfeed/ui/molecules/ChatLink";
import { PaperCardFooter } from "@hackerfeed/ui/molecules/PaperCardFooter";
import { PaperResourceLinks } from "@hackerfeed/ui/molecules/PaperResourceLinks";
import { PaperSignals } from "@hackerfeed/ui/molecules/PaperSignals";
import { PaperTitle } from "@hackerfeed/ui/molecules/PaperTitle";
import { Bookmark } from "lucide-react";
import { useChatProvider } from "#/hooks/useAppearance";
import {
	buildPaperChatUrl,
	formatAuthors,
	formatPaperDate,
	type PaperPresentation,
} from "#/lib/papers/presentation";
import { PaperSummary } from "./PaperSummary";

type PaperRowProps = {
	canFavorite: boolean;
	markSaved?: boolean;
	isFavorited: boolean;
	isPending: boolean;
	onToggleFavorite: () => void;
	onView: (action: PaperViewAction) => void;
	paper: PaperPresentation;
};

export function PaperRow({
	canFavorite,
	markSaved = true,
	isFavorited: saved,
	isPending: pending,
	onToggleFavorite,
	onView,
	paper,
}: PaperRowProps) {
	const { chatProvider } = useChatProvider();
	return (
		<PaperCard saved={markSaved && saved}>
			<Stack gap="sm">
				<PaperTitle href={paper.paperUrl} onClick={() => onView("read")}>
					{paper.title}
				</PaperTitle>
				<PaperSignals
					authors={formatAuthors(paper.authors)}
					upvotes={paper.upvotes}
					publishedLabel={formatPaperDate(paper.paperPublishedAt)}
					topics={paper.keywords}
				/>
			</Stack>
			<PaperSummary
				paper={paper}
				links={
					<PaperResourceLinks
						title={paper.title}
						projectPage={paper.projectPage}
						githubRepo={paper.githubRepo}
					/>
				}
			/>
			<PaperCardFooter
				actions={
					<ChatLink
						title={paper.title}
						providerName={CHAT_PROVIDERS[chatProvider].name}
						chatUrl={buildPaperChatUrl(paper, chatProvider)}
						onOpen={() => onView("chat_opened")}
					/>
				}
				save={
					canFavorite ? (
						<ToggleButton
							aria-label={`${saved ? "Saved" : "Save"} ${paper.title}`}
							pressed={saved}
							disabled={pending}
							onPressedChange={onToggleFavorite}
						>
							<Icon icon={Bookmark} filled={saved} />
							<ToggleLabel on={saved} offLabel="Save" onLabel="Saved" />
						</ToggleButton>
					) : null
				}
			/>
		</PaperCard>
	);
}
