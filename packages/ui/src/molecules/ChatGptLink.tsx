import { ArrowUpRight } from "lucide-react";
import { ExternalButtonLink } from "../atoms/Button";
import { Icon } from "../atoms/Icon";

/** No sparkle icon: that marks in-app AI, and this hands the story or paper off to ChatGPT. */
export function ChatGptLink({
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
			title="Opens ChatGPT in a new tab"
			onClick={onDiscuss}
		>
			Open in ChatGPT <Icon icon={ArrowUpRight} size={14} />
		</ExternalButtonLink>
	);
}
