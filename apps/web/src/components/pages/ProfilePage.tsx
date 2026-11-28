import { Skeleton } from "@autoskeleton/react";
import { Button, ButtonLink } from "@hackerfeed/ui/atoms/Button";
import { Heading } from "@hackerfeed/ui/atoms/Heading";
import { IconBadge } from "@hackerfeed/ui/atoms/IconBadge";
import { PageContainer } from "@hackerfeed/ui/atoms/PageContainer";
import { Panel } from "@hackerfeed/ui/atoms/Panel";
import { Row } from "@hackerfeed/ui/atoms/Row";
import { Stack } from "@hackerfeed/ui/atoms/Stack";
import { Text } from "@hackerfeed/ui/atoms/Text";
import { ProfileSummary } from "@hackerfeed/ui/molecules/ProfileSummary";
import { ChartColumn, Settings, User } from "lucide-react";
import { signIn, useAuthSession } from "#/hooks/useAuthSession";
import type { AuthSessionUser } from "#/lib/auth/session-user";

const USER_PLACEHOLDER: AuthSessionUser = {
	id: "placeholder",
	email: "reader@example.com",
	firstName: "Reader",
	lastName: "Name",
	profilePictureUrl: null,
};

function getDisplayName(
	firstName: string | null,
	lastName: string | null,
	email: string,
) {
	return [firstName, lastName].filter(Boolean).join(" ") || email;
}

function getInitials(
	firstName: string | null,
	lastName: string | null,
	email: string,
) {
	const first = firstName?.[0] ?? "";
	const last = lastName?.[0] ?? "";
	if (first || last) return `${first}${last}`.toUpperCase();
	return email[0].toUpperCase();
}

export function ProfilePage() {
	const { user, isLoading } = useAuthSession();

	if (!isLoading && !user) {
		return (
			<PageContainer spacing="status">
				<Panel width="full">
					<Stack gap="md" align="start">
						<IconBadge icon={User} tone="soft" size={20} />
						<Heading level={1} size="section">
							Profile
						</Heading>
						<Text tone="soft" relaxed>
							Sign in to view your HackerFeed profile.
						</Text>
						<Button onClick={() => signIn("/profile")}>Sign in</Button>
					</Stack>
				</Panel>
			</PageContainer>
		);
	}

	const shown = user ?? USER_PLACEHOLDER;

	return (
		<PageContainer spacing="status">
			<Skeleton loading={isLoading}>
				<Panel width="full">
					<Stack gap="lg">
						<ProfileSummary
							name={getDisplayName(
								shown.firstName,
								shown.lastName,
								shown.email,
							)}
							email={shown.email}
							imageUrl={shown.profilePictureUrl}
							initials={getInitials(
								shown.firstName,
								shown.lastName,
								shown.email,
							)}
						/>

						<Row wrap>
							<ButtonLink to="/analytics" variant="secondary">
								<ChartColumn size={15} aria-hidden="true" />
								Analytics
							</ButtonLink>
							<ButtonLink to="/settings" variant="secondary">
								<Settings size={15} aria-hidden="true" />
								Settings
							</ButtonLink>
						</Row>
					</Stack>
				</Panel>
			</Skeleton>
		</PageContainer>
	);
}
