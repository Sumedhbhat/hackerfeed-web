import { ArrowUpRight } from "lucide-react";
import { ExternalButtonLink } from "../atoms/Button";
import { Heading } from "../atoms/Heading";
import { Icon } from "../atoms/Icon";
import { Kicker } from "../atoms/Kicker";

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
				<Kicker>Ask AI</Kicker>
			</div>
			<Heading level={1} size="title">
				{title}
			</Heading>
			{url ? (
				<div className="mt-1 -ml-1.5">
					<ExternalButtonLink href={url} variant="accent">
						Read article <Icon icon={ArrowUpRight} size={14} />
					</ExternalButtonLink>
				</div>
			) : null}
		</header>
	);
}
