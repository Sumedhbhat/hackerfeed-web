import { Button, ButtonLink } from "@hackerfeed/ui/atoms/Button";
import { Heading } from "@hackerfeed/ui/atoms/Heading";
import { IconBadge } from "@hackerfeed/ui/atoms/IconBadge";
import { PageContainer } from "@hackerfeed/ui/atoms/PageContainer";
import { Panel } from "@hackerfeed/ui/atoms/Panel";
import { Row } from "@hackerfeed/ui/atoms/Row";
import { Skeleton, SkeletonGroup } from "@hackerfeed/ui/atoms/Skeleton";
import { Stack } from "@hackerfeed/ui/atoms/Stack";
import { Text } from "@hackerfeed/ui/atoms/Text";
import { ProfileSummary } from "@hackerfeed/ui/molecules/ProfileSummary";
import { ChartColumn, Settings, User } from "lucide-react";
import { signIn, useAuthSession } from "#/hooks/useAuthSession";

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

	if (isLoading) {
		return (
			<PageContainer spacing="status">
				<Panel as="div" width="full">
					<SkeletonGroup>
						<Stack gap="md">
							<Skeleton width="5rem" height="avatar" shape="circle" />
							<Skeleton width="12rem" height="xl" shape="block" />
							<Skeleton width="16rem" height="md" shape="block" />
						</Stack>
					</SkeletonGroup>
				</Panel>
			</PageContainer>
		);
	}

	if (!user) {
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

	return (
		<PageContainer spacing="status">
			<Panel width="full">
				<Stack gap="lg">
					<ProfileSummary
						name={getDisplayName(user.firstName, user.lastName, user.email)}
						email={user.email}
						imageUrl={user.profilePictureUrl}
						initials={getInitials(user.firstName, user.lastName, user.email)}
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
		</PageContainer>
	);
}
