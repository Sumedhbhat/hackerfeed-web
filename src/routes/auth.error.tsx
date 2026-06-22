import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, RotateCw } from "lucide-react";

const authErrorCopy = {
	expired: {
		title: "Your sign-in link expired",
		body: "The sign-in attempt could not be verified. This usually happens when the browser was refreshed, the session timed out, or the sign-in link was already used.",
	},
	exchange_failed: {
		title: "Sign-in could not be completed",
		body: "The identity provider accepted the request, but HackerFeed could not finish creating your session. Try again, and contact support if it keeps happening.",
	},
	no_session: {
		title: "No session was created",
		body: "The sign-in response came back without a usable session. Try signing in again.",
	},
	start_failed: {
		title: "Sign-in is unavailable",
		body: "HackerFeed could not start the sign-in flow. Try again in a moment, and contact support if it keeps happening.",
	},
	default: {
		title: "Sign-in failed",
		body: "HackerFeed could not complete sign-in. Try again, and contact support if the problem continues.",
	},
};

export const Route = createFileRoute("/auth/error")({
	validateSearch: (search) => ({
		reason: typeof search.reason === "string" ? search.reason : "default",
	}),
	component: AuthErrorPage,
});

function AuthErrorPage() {
	const { reason } = Route.useSearch();
	const copy =
		authErrorCopy[reason as keyof typeof authErrorCopy] ??
		authErrorCopy.default;

	return (
		<main className="page-wrap min-h-[calc(100vh-9rem)] px-4 py-8">
			<section className="mx-auto max-w-xl rounded-lg border border-(--line) bg-(--surface-strong) p-5">
				<div className="flex h-11 w-11 items-center justify-center rounded-full border border-(--chip-line) bg-(--chip-bg) text-(--lagoon)">
					<AlertCircle size={21} aria-hidden="true" />
				</div>
				<p className="island-kicker mt-5">Authentication</p>
				<h1 className="mt-2 text-2xl font-semibold text-(--sea-ink)">
					{copy.title}
				</h1>
				<p className="mt-3 text-sm leading-6 text-(--sea-ink-soft)">
					{copy.body}
				</p>
				<div className="mt-6 flex flex-wrap gap-3">
					<a
						href="/auth/sign-in?returnTo=/"
						className="auth-primary-action inline-flex items-center gap-2 rounded-md bg-(--lagoon) px-3 py-2 text-sm font-semibold no-underline hover:bg-(--lagoon-deep) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--lagoon)"
					>
						<RotateCw size={15} aria-hidden="true" />
						Try again
					</a>
					<a
						href="/auth/sign-out"
						className="inline-flex rounded-md border border-(--chip-line) px-3 py-2 text-sm font-semibold text-(--sea-ink) no-underline hover:bg-(--chip-bg) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--lagoon)"
					>
						Clear session
					</a>
				</div>
			</section>
		</main>
	);
}
