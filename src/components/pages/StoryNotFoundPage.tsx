import { ArrowLeft } from "lucide-react";
import { Heading } from "#/components/atoms/Heading";
import { Icon } from "#/components/atoms/Icon";
import { Kicker } from "#/components/atoms/Kicker";
import { TextLink } from "#/components/atoms/Link";
import { PageContainer } from "#/components/atoms/PageContainer";
import { Stack } from "#/components/atoms/Stack";

/** Shown when the requested story doesn't exist. */
export function StoryNotFoundPage() {
	return (
		<PageContainer spacing="compact">
			<Stack gap="md" align="start">
				<Kicker>Not found</Kicker>
				<Heading level={1} size="page">
					Story not found.
				</Heading>
				<TextLink to="/" variant="accent">
					<Icon icon={ArrowLeft} /> Back to feed
				</TextLink>
			</Stack>
		</PageContainer>
	);
}
