import {
	Code2,
	ExternalLink as ExternalIcon,
	Globe,
	Sparkles,
} from "lucide-react";
import { ExternalButtonLink } from "../atoms/Button";
import { ButtonLabel } from "../atoms/ButtonLabel";
import { Icon } from "../atoms/Icon";

/**
 * "Ask ChatGPT" (hands the paper to chatgpt.com in a new tab) plus optional
 * project and code links. Project (globe) and Code show as icons on phones.
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
				aria-label={`Ask ChatGPT about ${title} (opens chatgpt.com)`}
				onClick={onDiscuss}
			>
				<Icon icon={Sparkles} />
				Ask ChatGPT <Icon icon={ExternalIcon} size={14} muted />
			</ExternalButtonLink>
			{projectPage ? (
				<ExternalButtonLink
					variant="ghost"
					href={projectPage}
					aria-label={`Project page for ${title}`}
				>
					<Icon icon={Globe} />
					<ButtonLabel>Project</ButtonLabel>
				</ExternalButtonLink>
			) : null}
			{githubRepo ? (
				<ExternalButtonLink
					variant="ghost"
					href={githubRepo}
					aria-label={`Code for ${title}`}
				>
					<Icon icon={Code2} />
					<ButtonLabel>Code</ButtonLabel>
				</ExternalButtonLink>
			) : null}
		</>
	);
}
