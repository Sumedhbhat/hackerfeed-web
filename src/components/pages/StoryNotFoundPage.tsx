import { Heading } from "@hackerfeed/ui/atoms/Heading";
import { Icon } from "@hackerfeed/ui/atoms/Icon";
import { Kicker } from "@hackerfeed/ui/atoms/Kicker";
import { TextLink } from "@hackerfeed/ui/atoms/Link";
import { PageContainer } from "@hackerfeed/ui/atoms/PageContainer";
import { Stack } from "@hackerfeed/ui/atoms/Stack";
import { ArrowLeft } from "lucide-react";

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
