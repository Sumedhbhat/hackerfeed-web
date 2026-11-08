import type { AiProviderStatus } from "@hackerfeed/contracts/ai";
import { Button } from "@hackerfeed/ui/atoms/Button";
import { ExternalLink } from "@hackerfeed/ui/atoms/Link";
import { Text } from "@hackerfeed/ui/atoms/Text";
import { useShowToast } from "@hackerfeed/ui/atoms/Toast";
import { ProviderRow } from "@hackerfeed/ui/molecules/ProviderRow";
import { useEffect, useRef } from "react";
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
	const showToast = useShowToast();
	const account = provider.account?.email ?? provider.account?.name;
	const connectId = `ai-connect-${provider.id}`;

	// Disconnect unmounts the focused button; focus its replacement once the
	// row has switched.
	const focusConnectRef = useRef(false);
	useEffect(() => {
		if (provider.connected || !focusConnectRef.current) return;
		focusConnectRef.current = false;
		document.getElementById(connectId)?.focus();
	}, [provider.connected, connectId]);

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
							aria-label={`${disconnect.isPending ? "Disconnecting" : "Disconnect"} ${provider.name}`}
							busy={disconnect.isPending}
							onClick={() =>
								disconnect.mutate(provider.id, {
									onSuccess: () => {
										focusConnectRef.current = true;
										showToast({ title: `${provider.name} disconnected` });
									},
								})
							}
						>
							{disconnect.isPending ? "Disconnecting…" : "Disconnect"}
						</Button>
					</>
				) : provider.canConnect ? (
					<Button
						id={connectId}
						onClick={() => void connectAiProvider(provider.id, returnTo)}
					>
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
