import { ArrowUpRight } from "lucide-react";
import { ExternalButtonLink } from "../atoms/Button";
import { Icon } from "../atoms/Icon";

/** No sparkle icon: that marks in-app AI, and this hands the story or paper off to the reader's chosen AI chat. */
export function ChatLink({
	title,
	providerName,
	chatUrl,
	onOpen,
}: {
	title: string;
	providerName: string;
	chatUrl: string;
	onOpen?: () => void;
}) {
	return (
		<ExternalButtonLink
			variant="ghost"
			href={chatUrl}
			aria-label={`Chat with AI: ${title}`}
			title={`Opens ${providerName} in a new tab`}
			onClick={onOpen}
		>
			Chat with AI <Icon icon={ArrowUpRight} size={14} />
		</ExternalButtonLink>
	);
}
