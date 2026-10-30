import { User } from "lucide-react";
import { Button, ButtonLink } from "#/components/atoms/Button";
import { Heading } from "#/components/atoms/Heading";
import { IconBadge } from "#/components/atoms/IconBadge";
import { PageContainer } from "#/components/atoms/PageContainer";
import { Panel } from "#/components/atoms/Panel";
import { PanelSection } from "#/components/atoms/PanelSection";
import { Skeleton, SkeletonGroup } from "#/components/atoms/Skeleton";
import { Stack } from "#/components/atoms/Stack";
import { Text } from "#/components/atoms/Text";
import { DetailList } from "#/components/molecules/DetailList";
import { ProfileSummary } from "#/components/molecules/ProfileSummary";
import { AiProvidersCard } from "#/components/organisms/ai/AiProvidersCard";
import { signIn, useAuthSession } from "#/hooks/useAuthSession";
import { useFeatureFlag } from "#/hooks/useFeatureFlags";

export type ProfileSearch = {
	/** Result of an AI provider sign-in, set by the provider callback. */
	ai?: "connected" | "error";
	provider?: string;
	reason?: string;
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

export function ProfilePage({ search }: { search: ProfileSearch }) {
	const { user, isLoading } = useAuthSession();
	const aiChat = useFeatureFlag("aiChat");

	if (isLoading) {
		return (
			<PageContainer spacing="status">
				<Panel as="div" width="lg">
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
				<Panel width="lg">
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
			<Panel width="lg">
				<Stack gap="lg">
					<ProfileSummary
						name={getDisplayName(user.firstName, user.lastName, user.email)}
						email={user.email}
						imageUrl={user.profilePictureUrl}
						initials={getInitials(user.firstName, user.lastName, user.email)}
					/>

					<PanelSection as="div">
						<DetailList
							items={[
								{ label: "First name", value: user.firstName || "Not set" },
								{ label: "Last name", value: user.lastName || "Not set" },
							]}
						/>
					</PanelSection>

					{aiChat ? (
						<AiProvidersCard
							result={search.ai}
							resultProviderId={search.provider}
							reason={search.reason}
						/>
					) : null}

					<div>
						<ButtonLink to="/favorites" variant="secondary">
							View favorites
						</ButtonLink>
					</div>
				</Stack>
			</Panel>
		</PageContainer>
	);
}
