import { ExternalLink, MessageCircle } from "lucide-react";

/** "Discuss" in ChatGPT plus optional project and code links for a paper. */
export function PaperLinks({
	title,
	discussUrl,
	projectPage,
	githubRepo,
}: {
	title: string;
	discussUrl: string;
	projectPage: string | null;
	githubRepo: string | null;
}) {
	return (
		<div className="papers-external-links is-compact">
			<a
				className="papers-chat-link"
				href={discussUrl}
				target="_blank"
				rel="noreferrer"
				aria-label={`Discuss ${title} in ChatGPT`}
			>
				<MessageCircle size={14} aria-hidden="true" />
				Discuss
			</a>
			{projectPage ? (
				<a href={projectPage} target="_blank" rel="noreferrer">
					Project <ExternalLink size={14} aria-hidden="true" />
				</a>
			) : null}
			{githubRepo ? (
				<a href={githubRepo} target="_blank" rel="noreferrer">
					Code <ExternalLink size={14} aria-hidden="true" />
				</a>
			) : null}
		</div>
	);
}
