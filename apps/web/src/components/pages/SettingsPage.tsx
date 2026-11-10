import { Heading } from "@hackerfeed/ui/atoms/Heading";
import { PageContainer } from "@hackerfeed/ui/atoms/PageContainer";
import { Panel } from "@hackerfeed/ui/atoms/Panel";
import { Stack } from "@hackerfeed/ui/atoms/Stack";
import { AppearanceSettings } from "#/components/organisms/settings/AppearanceSettings";

export function SettingsPage() {
	return (
		<PageContainer spacing="status">
			<Panel width="full">
				<Stack gap="lg">
					<Heading level={1} size="page">
						Settings
					</Heading>
					<AppearanceSettings />
				</Stack>
			</Panel>
		</PageContainer>
	);
}
