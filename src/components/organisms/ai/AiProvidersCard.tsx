import { CheckCircle2, Sparkles, TriangleAlert } from "lucide-react";
import { Button } from "#/components/atoms/Button";
import { PanelSection } from "#/components/atoms/PanelSection";
import { Row } from "#/components/atoms/Row";
import { Skeleton, SkeletonGroup } from "#/components/atoms/Skeleton";
import { Stack } from "#/components/atoms/Stack";
import { Text } from "#/components/atoms/Text";
import { IconHeading } from "#/components/molecules/IconHeading";
import { IconText } from "#/components/molecules/IconText";
import { AiProviderRow } from "#/components/organisms/ai/AiProviderRow";
import { useAiProviders } from "#/hooks/useAiProviders";

const RESULT_MESSAGES: Record<string, (name: string) => string> = {
	access_denied: (name) => `${name} sign-in was cancelled.`,
	expired: (name) => `That ${name} sign-in took too long. Try again.`,
	provider_unavailable: (name) =>
		`${name} sign-in isn't configured for this deployment.`,
	provider_not_found: () => "That AI app isn't available.",
	plan_usage_not_granted: (name) =>
		`${name} didn't grant access to your plan. Connect again and allow HackerFeed to use it.`,
	subscription_sharing_user_not_eligible: (name) =>
		`Your ${name} plan or workspace can't be used in other apps.`,
};

export function getAiResultMessage(
	providerName: string,
	reason: string | undefined,
): string {
	const message = reason ? RESULT_MESSAGES[reason] : undefined;
	return message
		? message(providerName)
		: `Couldn't connect ${providerName}. Try again.`;
}

type AiProvidersCardProps = {
	result?: "connected" | "error";
	resultProviderId?: string;
	reason?: string;
	returnTo?: string;
};

/** Profile section listing every AI app from the catalog the user can connect. */
export function AiProvidersCard({
	result,
	resultProviderId,
	reason,
	returnTo = "/profile",
}: AiProvidersCardProps) {
	const { data: providers, isError, isLoading, refetch } = useAiProviders();
	const resultProvider = providers?.find(
		(provider) => provider.id === resultProviderId,
	);

	return (
		<PanelSection aria-labelledby="ai-providers-heading">
			<Stack gap="md">
				<Stack gap="sm">
					<IconHeading icon={Sparkles} id="ai-providers-heading">
						AI assistants
					</IconHeading>
					<Text tone="soft" relaxed>
						Sign in with an AI app you already pay for to discuss stories right
						here, using your own plan.
					</Text>
				</Stack>

				{result === "connected" && resultProvider?.connected ? (
					<IconText icon={CheckCircle2} role="status">
						{resultProvider.name} is connected.
					</IconText>
				) : null}
				{result === "error" ? (
					<IconText icon={TriangleAlert} role="alert">
						{getAiResultMessage(resultProvider?.name ?? "the AI app", reason)}
					</IconText>
				) : null}

				{isLoading ? (
					<SkeletonGroup>
						<Skeleton height="block" shape="block" />
					</SkeletonGroup>
				) : isError || !providers ? (
					<Row gap="md">
						<Text as="span" tone="soft">
							Couldn't load your AI connections.
						</Text>
						<Button variant="secondary" onClick={() => void refetch()}>
							Retry
						</Button>
					</Row>
				) : providers.length === 0 ? (
					<Text tone="soft">No AI apps are available yet.</Text>
				) : (
					<Stack as="ul" gap="md" aria-label="AI apps">
						{providers.map((provider) => (
							<AiProviderRow
								key={provider.id}
								provider={provider}
								returnTo={returnTo}
							/>
						))}
					</Stack>
				)}
			</Stack>
		</PanelSection>
	);
}
