import { ArrowUpRight } from "lucide-react";
import { ExternalButtonLink } from "../atoms/Button";
import { Icon } from "../atoms/Icon";

/**
 * A paper's action besides opening it (a click on the card does that): hand it
 * to ChatGPT in a new tab. There is no in-app paper chat yet, so this hand-off
 * has no sparkle, which means in-app AI.
 */
export function PaperLinks({
	title,
	discussUrl,
	onDiscuss,
}: {
	title: string;
	discussUrl: string;
	onDiscuss?: () => void;
}) {
	return (
		<ExternalButtonLink
			variant="ghost"
			href={discussUrl}
			aria-label={`Open in ChatGPT: ${title}`}
			title="Opens ChatGPT in a new tab with this paper"
			onClick={onDiscuss}
		>
			Open in ChatGPT <Icon icon={ArrowUpRight} size={14} />
		</ExternalButtonLink>
	);
}
