import { createAiClient } from "@hackerfeed/api-client/ai";
import { getApiHeaders, signIn } from "#/lib/auth/authkit";

export const {
	connectAiProvider,
	disconnectAiProvider,
	fetchAiModels,
	fetchAiProviders,
	streamStoryChat,
} = createAiClient({ getHeaders: getApiHeaders, signIn });
