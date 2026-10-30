import type { AiProviderStatus } from "@hackerfeed/contracts/ai";
import { useState } from "react";
import { ProviderConversation } from "#/components/organisms/chat/ProviderConversation";

/** Picks one of the user's connected providers; switching starts a new chat. */
export function ChatConversation({
	storyId,
	providers,
}: {
	storyId: number;
	providers: AiProviderStatus[];
}) {
	const [selectedId, setSelectedId] = useState<string>();
	const provider =
		providers.find((candidate) => candidate.id === selectedId) ?? providers[0];

	return (
		<ProviderConversation
			key={provider.id}
			storyId={storyId}
			provider={provider}
			providers={providers}
			onProviderChange={setSelectedId}
		/>
	);
}
