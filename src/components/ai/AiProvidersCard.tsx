import { CheckCircle2, Sparkles, TriangleAlert } from "lucide-react";
import { Button } from "#/components/atoms/Button";
import {
	useAiProviders,
	useDisconnectAiProvider,
} from "#/hooks/useAiProviders";
import { connectAiProvider } from "#/lib/ai/client";
import type { AiProviderStatus } from "#/lib/ai/schemas";

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
		<section
			aria-labelledby="ai-providers-heading"
			className="mt-6 border-t border-(--line) pt-5"
		>
			<div className="flex items-center gap-2">
				<Sparkles
					size={16}
					aria-hidden="true"
					className="text-(--sea-ink-soft)"
				/>
				<h2
					id="ai-providers-heading"
					className="m-0 text-base font-semibold text-(--sea-ink)"
				>
					AI assistants
				</h2>
			</div>
			<p className="mt-2 text-sm leading-6 text-(--sea-ink-soft)">
				Sign in with an AI app you already pay for to discuss stories right
				here, using your own plan.
			</p>

			{result === "connected" && resultProvider?.connected ? (
				<p
					role="status"
					className="mt-3 flex items-center gap-2 text-sm text-(--sea-ink)"
				>
					<CheckCircle2 size={15} aria-hidden="true" /> {resultProvider.name} is
					connected.
				</p>
			) : null}
			{result === "error" ? (
				<p
					role="alert"
					className="mt-3 flex items-center gap-2 text-sm text-(--sea-ink)"
				>
					<TriangleAlert size={15} aria-hidden="true" />
					{getAiResultMessage(resultProvider?.name ?? "the AI app", reason)}
				</p>
			) : null}

			{isLoading ? (
				<div className="mt-4 h-16 rounded bg-(--chip-bg) animate-pulse" />
			) : isError || !providers ? (
				<div className="mt-4 flex items-center gap-3 text-sm text-(--sea-ink-soft)">
					<span>Couldn't load your AI connections.</span>
					<Button variant="secondary" onClick={() => void refetch()}>
						Retry
					</Button>
				</div>
			) : providers.length === 0 ? (
				<p className="mt-4 text-sm text-(--sea-ink-soft)">
					No AI apps are available yet.
				</p>
			) : (
				<ul aria-label="AI apps" className="m-0 mt-4 list-none space-y-3 p-0">
					{providers.map((provider) => (
						<AiProviderRow
							key={provider.id}
							provider={provider}
							returnTo={returnTo}
						/>
					))}
				</ul>
			)}
		</section>
	);
}

function AiProviderRow({
	provider,
	returnTo,
}: {
	provider: AiProviderStatus;
	returnTo: string;
}) {
	const disconnect = useDisconnectAiProvider();
	const account = provider.account?.email ?? provider.account?.name;

	return (
		<li
			aria-label={provider.name}
			className="rounded-lg border border-(--line) p-4"
		>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="m-0 text-sm font-semibold text-(--sea-ink)">
						{provider.name}
					</p>
					<p className="m-0 mt-1 text-sm text-(--sea-ink-soft)">
						{provider.connected
							? `Connected${account ? ` as ${account}` : ""}`
							: provider.description}
					</p>
				</div>

				{provider.connected ? (
					<div className="flex flex-wrap items-center gap-3">
						{provider.manageUrl ? (
							<a
								href={provider.manageUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="text-sm text-(--lagoon-deep) hover:underline"
							>
								Manage usage
							</a>
						) : null}
						<Button
							variant="secondary"
							aria-label={`Disconnect ${provider.name}`}
							disabled={disconnect.isPending}
							onClick={() => disconnect.mutate(provider.id)}
						>
							{disconnect.isPending ? "Disconnecting…" : "Disconnect"}
						</Button>
					</div>
				) : provider.canConnect ? (
					<Button onClick={() => void connectAiProvider(provider.id, returnTo)}>
						Sign in with {provider.name}
					</Button>
				) : (
					<p className="m-0 text-sm text-(--sea-ink-soft)">
						Not available on this deployment yet.
					</p>
				)}
			</div>
			{disconnect.isError ? (
				<p role="alert" className="m-0 mt-2 text-sm text-(--sea-ink)">
					Couldn't disconnect {provider.name}. Try again.
				</p>
			) : null}
		</li>
	);
}
