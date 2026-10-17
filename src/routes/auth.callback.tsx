import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AlertCircle, RotateCw } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/atoms/Button";
import { TraceIdNote } from "#/components/trace-id-note";
import { signIn, useAuthSession } from "#/hooks/useAuthSession";
import { useErrorReport } from "#/hooks/useErrorReport";
import { toSafeReturnTo } from "#/lib/auth/authkit";

// AuthKit exchanges the code in the browser; this shows a spinner meanwhile,
// then navigates to the original page, or shows the failure when AuthKit
// finishes without a user.
export const Route = createFileRoute("/auth/callback")({
	component: AuthCallback,
});

type CallbackParams = {
	returnTo: string;
	hadCode: boolean;
	providerError: string | null;
	providerErrorDescription: string | null;
};

function readCallbackParams(): CallbackParams {
	if (typeof window === "undefined") {
		return {
			returnTo: "/",
			hadCode: false,
			providerError: null,
			providerErrorDescription: null,
		};
	}
	const params = new URLSearchParams(window.location.search);
	return {
		returnTo: readReturnTo(params.get("state")),
		hadCode: params.has("code"),
		providerError: params.get("error"),
		providerErrorDescription: params.get("error_description"),
	};
}

function readReturnTo(state: string | null): string {
	try {
		return toSafeReturnTo(state ? JSON.parse(state)?.returnTo : undefined);
	} catch {
		return "/";
	}
}

function AuthCallback() {
	const { isLoading, user } = useAuthSession();
	// Read before AuthKit strips `code` and `state` from the URL.
	const [params] = useState(readCallbackParams);

	if (isLoading || user) {
		return (
			<div className="flex min-h-[60vh] items-center justify-center">
				{user ? <Navigate href={params.returnTo} replace /> : null}
				<div className="h-8 w-8 animate-spin rounded-full border-2 border-(--chip-line) border-t-(--lagoon)" />
			</div>
		);
	}

	return <SignInFailed params={params} />;
}

const signInFailedError = new Error(
	"WorkOS sign-in callback finished without a session",
);

function SignInFailed({ params }: { params: CallbackParams }) {
	const traceId = useErrorReport("Sign-in failed", signInFailedError, params);

	return (
		<main className="page-wrap min-h-[calc(100vh-9rem)] px-4 py-8">
			<section className="mx-auto max-w-xl rounded-lg border border-(--line) bg-(--surface-strong) p-5">
				<div className="flex h-11 w-11 items-center justify-center rounded-full border border-(--chip-line) bg-(--chip-bg) text-(--lagoon)">
					<AlertCircle size={21} aria-hidden="true" />
				</div>
				<p className="island-kicker mt-5">Authentication</p>
				<h1 className="mt-2 text-2xl font-semibold text-(--sea-ink)">
					Sign-in didn&apos;t complete
				</h1>
				<p className="mt-3 text-sm leading-6 text-(--sea-ink-soft)">
					WorkOS couldn&apos;t finish signing you in on this device. This can
					happen when sign-in starts in one browser or app and finishes in
					another. Try again from here.
				</p>
				<TraceIdNote traceId={traceId} />
				<div className="mt-6">
					<Button onClick={() => signIn("/")}>
						<RotateCw size={15} aria-hidden="true" />
						Try again
					</Button>
				</div>
			</section>
		</main>
	);
}
