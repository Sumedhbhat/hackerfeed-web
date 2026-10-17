import type { ReactNode } from "react";
import { Card } from "#/components/atoms/Card";
import { Heading } from "#/components/atoms/Heading";
import { Text } from "#/components/atoms/Text";

/** Card with a short message and what to do about it, e.g. "Sign in to chat. [Sign in]". */
export function NoticeCard({
	title,
	message,
	actions,
	role,
}: {
	/** Optional page heading above the message. */
	title?: string;
	message: ReactNode;
	/** Buttons or links shown under the message. */
	actions?: ReactNode;
	role?: "alert";
}) {
	return (
		<Card as="section" padding="sm" role={role}>
			{title ? (
				<div className="mb-2">
					<Heading level={1} size="section">
						{title}
					</Heading>
				</div>
			) : null}
			<Text tone="soft" relaxed>
				{message}
			</Text>
			{actions ? (
				<div className="mt-4 flex flex-wrap items-center gap-3">{actions}</div>
			) : null}
		</Card>
	);
}
