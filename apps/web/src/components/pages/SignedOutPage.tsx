import { Button } from "@hackerfeed/ui/atoms/Button";
import { PageContainer } from "@hackerfeed/ui/atoms/PageContainer";
import { StatusPanel } from "@hackerfeed/ui/molecules/StatusPanel";
import { CircleCheck, LogIn } from "lucide-react";
import { signIn } from "#/hooks/useAuthSession";

export function SignedOutPage() {
	return (
		<PageContainer spacing="status">
			<StatusPanel
				icon={CircleCheck}
				kicker="Authentication"
				title="You're signed out"
				description="Your HackerFeed session has been cleared on this device."
				actions={
					<Button onClick={() => signIn("/")}>
						<LogIn size={15} aria-hidden="true" />
						Sign in
					</Button>
				}
			/>
		</PageContainer>
	);
}
