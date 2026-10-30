import type { AiProviderStatus } from "@hackerfeed/contracts/ai";
import { Button } from "#/components/atoms/Button";
import { ExternalLink } from "#/components/atoms/Link";
import { Text } from "#/components/atoms/Text";
import { ProviderRow } from "#/components/molecules/ProviderRow";
import { useDisconnectAiProvider } from "#/hooks/useAiProviders";
import { connectAiProvider } from "#/lib/ai/client";

/** One AI app with its connection status and connect/disconnect actions. */
export function AiProviderRow({
	provider,
	returnTo,
}: {
	provider: AiProviderStatus;
	returnTo: string;
}) {
	const disconnect = useDisconnectAiProvider();
	const account = provider.account?.email ?? provider.account?.name;

	return (
		<ProviderRow
			name={provider.name}
			detail={
				provider.connected
					? `Connected${account ? ` as ${account}` : ""}`
					: provider.description
			}
			actions={
				provider.connected ? (
					<>
						{provider.manageUrl ? (
							<ExternalLink href={provider.manageUrl} variant="accent">
								Manage usage
							</ExternalLink>
						) : null}
						<Button
							variant="secondary"
							aria-label={`Disconnect ${provider.name}`}
							disabled={disconnect.isPending}
							onClick={() => disconnect.mutate(provider.id)}
						>
							{disconnect.isPending ? "Disconnecting…" : "Disconnect"}
						</Button>
					</>
				) : provider.canConnect ? (
					<Button onClick={() => void connectAiProvider(provider.id, returnTo)}>
						Sign in with {provider.name}
					</Button>
				) : (
					<Text tone="soft">Not available on this deployment yet.</Text>
				)
			}
			error={
				disconnect.isError
					? `Couldn't disconnect ${provider.name}. Try again.`
					: undefined
			}
		/>
	);
}
