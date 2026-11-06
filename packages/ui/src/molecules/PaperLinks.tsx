import { Code2, ExternalLink as ExternalIcon, Globe } from "lucide-react";
import { ExternalButtonLink } from "../atoms/Button";
import { Icon } from "../atoms/Icon";

/**
 * Links out from a paper: hand it to ChatGPT (there is no in-app paper chat,
 * so no sparkle, which means in-app AI), plus optional project and code pages.
 */
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
				variant="accent"
				href={discussUrl}
				aria-label={`Open in ChatGPT: ${title}`}
				onClick={onDiscuss}
			>
				Open in ChatGPT <Icon icon={ExternalIcon} size={14} muted />
			</ExternalButtonLink>
			{projectPage ? (
				<ExternalButtonLink
					variant="ghost"
					href={projectPage}
					aria-label={`Project page for ${title}`}
				>
					<Icon icon={Globe} />
					Project
				</ExternalButtonLink>
			) : null}
			{githubRepo ? (
				<ExternalButtonLink
					variant="ghost"
					href={githubRepo}
					aria-label={`Code for ${title}`}
				>
					<Icon icon={Code2} />
					Code
				</ExternalButtonLink>
			) : null}
		</>
	);
}
