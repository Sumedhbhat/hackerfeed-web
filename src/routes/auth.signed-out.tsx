import { createFileRoute } from "@tanstack/react-router";
import { CircleCheck, LogIn } from "lucide-react";

export const Route = createFileRoute("/auth/signed-out")({
	component: SignedOutPage,
});

function SignedOutPage() {
	return (
		<main className="page-wrap min-h-[calc(100vh-9rem)] px-4 py-8">
			<section className="mx-auto max-w-xl rounded-lg border border-(--line) bg-(--surface-strong) p-5">
				<div className="flex h-11 w-11 items-center justify-center rounded-full border border-(--chip-line) bg-(--chip-bg) text-(--lagoon)">
					<CircleCheck size={21} aria-hidden="true" />
				</div>
				<p className="island-kicker mt-5">Authentication</p>
				<h1 className="mt-2 text-2xl font-semibold text-(--sea-ink)">
					You&apos;re signed out
				</h1>
				<p className="mt-3 text-sm leading-6 text-(--sea-ink-soft)">
					Your HackerFeed session has been cleared on this device.
				</p>
				<a
					href="/auth/sign-in?returnTo=/"
					className="auth-primary-action mt-6 inline-flex items-center gap-2 rounded-md bg-(--lagoon) px-3 py-2 text-sm font-semibold no-underline hover:bg-(--lagoon-deep) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--lagoon)"
				>
					<LogIn size={15} aria-hidden="true" />
					Sign in
				</a>
			</section>
		</main>
	);
}
