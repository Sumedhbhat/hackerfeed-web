import { ExternalLink as ExternalIcon, MessageCircle } from "lucide-react";
import { ExternalButtonLink } from "../atoms/Button";
import { Icon } from "../atoms/Icon";

/** "Discuss" in ChatGPT plus optional project and code links for a paper. */
export function PaperLinks({
	title,
	discussUrl,
	projectPage,
	githubRepo,
	onDiscuss,
}: {
	title: string;
	discussUrl: string;
	projectPage: string | null;
	githubRepo: string | null;
	onDiscuss?: () => void;
}) {
	return (
		<>
			<ExternalButtonLink
				variant="soft"
				href={discussUrl}
				aria-label={`Discuss ${title} in ChatGPT`}
				onClick={onDiscuss}
			>
				<Icon icon={MessageCircle} />
				Discuss
			</ExternalButtonLink>
			{projectPage ? (
				<ExternalButtonLink variant="ghost" href={projectPage}>
					Project <Icon icon={ExternalIcon} size={14} muted />
				</ExternalButtonLink>
			) : null}
			{githubRepo ? (
				<ExternalButtonLink variant="ghost" href={githubRepo}>
					Code <Icon icon={ExternalIcon} size={14} muted />
				</ExternalButtonLink>
			) : null}
		</>
	);
}
