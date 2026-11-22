import {
	CHAT_PROVIDERS,
	chatProviderIdSchema,
} from "@hackerfeed/entities/chat-providers";
import { PanelSection } from "@hackerfeed/ui/atoms/PanelSection";
import { Stack } from "@hackerfeed/ui/atoms/Stack";
import { Text } from "@hackerfeed/ui/atoms/Text";
import { ToggleGroup, ToggleGroupItem } from "@hackerfeed/ui/atoms/Toggle";
import { IconHeading } from "@hackerfeed/ui/molecules/IconHeading";
import { MessagesSquare } from "lucide-react";
import { useChatProvider } from "#/hooks/useAppearance";

/** Settings section for the AI chat that "Chat with AI" opens, saved to the account. */
export function ChatProviderSettings() {
	const { chatProvider, setChatProvider } = useChatProvider();

	return (
		<PanelSection aria-labelledby="chat-provider-heading">
			<Stack gap="md" align="start">
				<Stack gap="sm">
					<IconHeading icon={MessagesSquare} id="chat-provider-heading">
						AI chat
					</IconHeading>
					<Text tone="soft" relaxed>
						Chat with AI opens a story or paper in this chat, in a new tab, with
						a prompt about it already written.
					</Text>
				</Stack>
				<ToggleGroup
					value={chatProvider}
					onValueChange={setChatProvider}
					layout="segmented"
					aria-labelledby="chat-provider-heading"
				>
					{chatProviderIdSchema.options.map((id) => (
						<ToggleGroupItem key={id} variant="segment" value={id}>
							{CHAT_PROVIDERS[id].name}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			</Stack>
		</PanelSection>
	);
}
