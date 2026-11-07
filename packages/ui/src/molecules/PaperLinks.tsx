import { ArrowUpRight } from "lucide-react";
import { ExternalButtonLink } from "../atoms/Button";
import { Icon } from "../atoms/Icon";
import { WideText } from "../atoms/WideText";

/**
 * A paper's two main actions: read it (the green main action, like Read
 * article on stories) and hand it to ChatGPT in a new tab. There is no in-app
 * paper chat yet, so this hand-off has no sparkle, which means in-app AI.
 */
export function PaperLinks({
	title,
	paperUrl,
	discussUrl,
	onRead,
	onDiscuss,
}: {
	title: string;
	paperUrl: string;
	discussUrl: string;
	onRead?: () => void;
	onDiscuss?: () => void;
}) {
	return (
		<>
			<ExternalButtonLink
				variant="accent"
				href={paperUrl}
				aria-label={`Read paper: ${title}`}
				onClick={onRead}
			>
				<span>
					Read<WideText from="xs"> paper</WideText>
				</span>
				<Icon icon={ArrowUpRight} size={14} />
			</ExternalButtonLink>
			<ExternalButtonLink
				variant="ghost"
				href={discussUrl}
				aria-label={`Open in ChatGPT: ${title}`}
				title="Opens ChatGPT in a new tab with this paper"
				onClick={onDiscuss}
			>
				Open in ChatGPT <Icon icon={ArrowUpRight} size={14} />
			</ExternalButtonLink>
		</>
	);
}
