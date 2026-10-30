import { ArrowRight } from "lucide-react";
import { Heading } from "../atoms/Heading";
import { Icon } from "../atoms/Icon";
import { Kicker } from "../atoms/Kicker";
import { ExternalLink } from "../atoms/Link";

/** Title block of the story chat screen, with a link to the article. */
export function StoryChatHeader({
	title,
	url,
}: {
	title: string;
	url?: string | null;
}) {
	return (
		<header className="mb-6">
			<div className="mb-2">
				<Kicker>Discuss with AI</Kicker>
			</div>
			<Heading level={1} size="title">
				{title}
			</Heading>
			{url ? (
				<div className="mt-2">
					<ExternalLink href={url} variant="accent">
						Read article <Icon icon={ArrowRight} muted />
					</ExternalLink>
				</div>
			) : null}
		</header>
	);
}
