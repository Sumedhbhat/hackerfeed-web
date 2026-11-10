import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { ExternalButtonLink } from "../atoms/Button";
import { Heading } from "../atoms/Heading";
import { Icon } from "../atoms/Icon";
import { Kicker } from "../atoms/Kicker";
import { ActionLine } from "./ActionLine";

export function StoryChatHeader({
	title,
	url,
	actions,
}: {
	title: ReactNode;
	url?: string | null;
	actions?: ReactNode;
}) {
	return (
		<header className="mb-6">
			<div className="mb-2">
				<Kicker>Ask AI</Kicker>
			</div>
			<Heading level={1} size="title">
				{title}
			</Heading>
			<div className="mt-1">
				<ActionLine>
					{url ? (
						<ExternalButtonLink href={url} variant="accent">
							Read article <Icon icon={ArrowUpRight} size={14} />
						</ExternalButtonLink>
					) : null}
					{actions}
				</ActionLine>
			</div>
		</header>
	);
}
