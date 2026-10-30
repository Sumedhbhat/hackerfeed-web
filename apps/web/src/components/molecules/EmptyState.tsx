import type { ReactNode } from "react";
import { Card } from "#/components/atoms/Card";
import { Heading } from "#/components/atoms/Heading";
import { Kicker } from "#/components/atoms/Kicker";
import { Stack } from "#/components/atoms/Stack";
import { Text } from "#/components/atoms/Text";

type EmptyStateProps = {
	kicker: string;
	title: string;
	description?: ReactNode;
	/** Link or button that gets the user unstuck. */
	action?: ReactNode;
	headingLevel?: 1 | 2 | 3;
	/** `section` for smaller in-page states such as a feed that failed to load. */
	headingSize?: "page" | "section";
	/** Extra content under the description, such as a trace ID note. */
	children?: ReactNode;
};

/** Card explaining why there is nothing here and what to do next. */
export function EmptyState({
	kicker,
	title,
	description,
	action,
	headingLevel = 2,
	headingSize = "page",
	children,
}: EmptyStateProps) {
	return (
		<Card padding="lg" animated>
			<Stack gap="md">
				<Kicker>{kicker}</Kicker>
				<Heading level={headingLevel} size={headingSize}>
					{title}
				</Heading>
				{description ? (
					<Text tone="soft" relaxed measure="md">
						{description}
					</Text>
				) : null}
				{children}
				{action ? <div className="mt-2">{action}</div> : null}
			</Stack>
		</Card>
	);
}
