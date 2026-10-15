import { CheckCircle2, MessageCircle, TriangleAlert } from "lucide-react";
import { useChatGptStatus, useDisconnectChatGpt } from "#/hooks/useChatGpt";
import { connectChatGpt } from "#/lib/chatgpt/client";

export const CHATGPT_USAGE_URL = "https://chatgpt.com/settings/usage";

const RESULT_MESSAGES: Record<string, string> = {
	access_denied: "ChatGPT sign-in was cancelled.",
	chatgpt_unavailable: "ChatGPT sign-in isn't configured for this deployment.",
	expired: "That ChatGPT sign-in took too long. Try again.",
	plan_usage_not_granted:
		"ChatGPT didn't grant access to your plan. Connect again and allow HackerFeed to use it.",
	subscription_sharing_user_not_eligible:
		"Your ChatGPT plan or workspace can't be used in other apps.",
};

export function getChatGptResultMessage(reason: string | undefined): string {
	return (
		(reason && RESULT_MESSAGES[reason]) ??
		"Couldn't connect ChatGPT. Try again."
	);
}

type ChatGptConnectionCardProps = {
	result?: "connected" | "error";
	reason?: string;
	returnTo?: string;
};

const buttonClassName =
	"rounded-md px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--lagoon) disabled:opacity-60";

export function ChatGptConnectionCard({
	result,
	reason,
	returnTo = "/profile",
}: ChatGptConnectionCardProps) {
	const { data: status, isError, isLoading, refetch } = useChatGptStatus();
	const disconnect = useDisconnectChatGpt();

	return (
		<section
			aria-labelledby="chatgpt-connection-heading"
			className="mt-6 border-t border-(--line) pt-5"
		>
			<div className="flex items-center gap-2">
				<MessageCircle
					size={16}
					aria-hidden="true"
					className="text-(--sea-ink-soft)"
				/>
				<h2
					id="chatgpt-connection-heading"
					className="m-0 text-base font-semibold text-(--sea-ink)"
				>
					ChatGPT
				</h2>
			</div>
			<p className="mt-2 text-sm leading-6 text-(--sea-ink-soft)">
				Sign in with ChatGPT to discuss stories right here, using your own
				ChatGPT plan.
			</p>

			{result === "connected" && status?.connected ? (
				<p
					role="status"
					className="mt-3 flex items-center gap-2 text-sm text-(--sea-ink)"
				>
					<CheckCircle2 size={15} aria-hidden="true" /> ChatGPT is connected.
				</p>
			) : null}
			{result === "error" ? (
				<p
					role="alert"
					className="mt-3 flex items-center gap-2 text-sm text-(--sea-ink)"
				>
					<TriangleAlert size={15} aria-hidden="true" />
					{getChatGptResultMessage(reason)}
				</p>
			) : null}

			{isLoading ? (
				<div className="mt-4 h-9 w-40 rounded bg-(--chip-bg) animate-pulse" />
			) : isError || !status ? (
				<div className="mt-4 flex items-center gap-3 text-sm text-(--sea-ink-soft)">
					<span>Couldn't load your ChatGPT connection.</span>
					<button
						type="button"
						onClick={() => void refetch()}
						className={`${buttonClassName} border border-(--chip-line) text-(--sea-ink) hover:bg-(--chip-bg)`}
					>
						Retry
					</button>
				</div>
			) : status.connected ? (
				<div className="mt-4 flex flex-wrap items-center gap-3">
					<p className="m-0 text-sm text-(--sea-ink)">
						Connected
						{status.email || status.name
							? ` as ${status.email ?? status.name}`
							: ""}
					</p>
					<a
						href={CHATGPT_USAGE_URL}
						target="_blank"
						rel="noopener noreferrer"
						className="text-sm text-(--lagoon-deep) hover:underline"
					>
						Manage usage
					</a>
					<button
						type="button"
						disabled={disconnect.isPending}
						onClick={() => disconnect.mutate()}
						className={`${buttonClassName} border border-(--chip-line) text-(--sea-ink) hover:bg-(--chip-bg)`}
					>
						{disconnect.isPending ? "Disconnecting…" : "Disconnect"}
					</button>
					{disconnect.isError ? (
						<p role="alert" className="m-0 w-full text-sm text-(--sea-ink)">
							Couldn't disconnect ChatGPT. Try again.
						</p>
					) : null}
				</div>
			) : status.canConnect ? (
				<button
					type="button"
					onClick={() => connectChatGpt(returnTo)}
					className={`${buttonClassName} mt-4 bg-(--lagoon) text-white hover:bg-(--lagoon-deep)`}
				>
					Sign in with ChatGPT
				</button>
			) : (
				<p className="mt-4 text-sm text-(--sea-ink-soft)">
					ChatGPT sign-in isn't available on this deployment yet.
				</p>
			)}
		</section>
	);
}
