import { Navigate } from "@tanstack/react-router";
import { AlertCircle, RotateCw } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/atoms/Button";
import { PageContainer } from "#/components/atoms/PageContainer";
import { LoadingScreen } from "#/components/molecules/LoadingScreen";
import { StatusPanel } from "#/components/molecules/StatusPanel";
import { TraceIdNote } from "#/components/molecules/TraceIdNote";
import { signIn, useAuthSession } from "#/hooks/useAuthSession";
import { useErrorReport } from "#/hooks/useErrorReport";
import { toSafeReturnTo } from "#/lib/auth/authkit";

// AuthKit exchanges the code in the browser; this shows a spinner meanwhile,
// then navigates to the original page, or shows the failure when AuthKit
// finishes without a user.

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

export function AuthCallbackPage() {
	const { isLoading, user } = useAuthSession();
	// Read before AuthKit strips `code` and `state` from the URL.
	const [params] = useState(readCallbackParams);

	if (isLoading || user) {
		return (
			<>
				{user ? <Navigate href={params.returnTo} replace /> : null}
				<LoadingScreen />
			</>
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
		<PageContainer spacing="status">
			<StatusPanel
				icon={AlertCircle}
				kicker="Authentication"
				title="Sign-in didn't complete"
				description="WorkOS couldn't finish signing you in on this device. This can happen when sign-in starts in one browser or app and finishes in another. Try again from here."
				actions={
					<Button onClick={() => signIn("/")}>
						<RotateCw size={15} aria-hidden="true" />
						Try again
					</Button>
				}
			>
				<TraceIdNote traceId={traceId} />
			</StatusPanel>
		</PageContainer>
	);
}
