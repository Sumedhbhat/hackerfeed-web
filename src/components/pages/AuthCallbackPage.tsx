import { AlertCircle, RotateCw } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/atoms/Button";
import { PageContainer } from "#/components/atoms/PageContainer";
import { LoadingScreen } from "#/components/molecules/LoadingScreen";
import { StatusPanel } from "#/components/molecules/StatusPanel";
import { TraceIdNote } from "#/components/molecules/TraceIdNote";
import { signIn, useAuthSession } from "#/hooks/useAuthSession";
import { useErrorReport } from "#/hooks/useErrorReport";

// AuthKit exchanges the code in the browser and then navigates to the
// original page (see `AuthProvider`); this shows a spinner meanwhile, or the
// failure when AuthKit finishes without a user.

type CallbackParams = {
	hadCode: boolean;
	providerError: string | null;
	providerErrorDescription: string | null;
};

function readCallbackParams(): CallbackParams {
	if (typeof window === "undefined") {
		return {
			hadCode: false,
			providerError: null,
			providerErrorDescription: null,
		};
	}
	const params = new URLSearchParams(window.location.search);
	return {
		hadCode: params.has("code"),
		providerError: params.get("error"),
		providerErrorDescription: params.get("error_description"),
	};
}

export function AuthCallbackPage() {
	const { isLoading, user } = useAuthSession();
	// Read before AuthKit strips `code` and `state` from the URL.
	const [params] = useState(readCallbackParams);

	if (isLoading || user) {
		return <LoadingScreen />;
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
