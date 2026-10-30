import { Button, ButtonLink } from "@hackerfeed/ui/atoms/Button";
import { Heading } from "@hackerfeed/ui/atoms/Heading";
import { IconBadge } from "@hackerfeed/ui/atoms/IconBadge";
import { PageContainer } from "@hackerfeed/ui/atoms/PageContainer";
import { Panel } from "@hackerfeed/ui/atoms/Panel";
import { PanelSection } from "@hackerfeed/ui/atoms/PanelSection";
import { Skeleton, SkeletonGroup } from "@hackerfeed/ui/atoms/Skeleton";
import { Stack } from "@hackerfeed/ui/atoms/Stack";
import { Text } from "@hackerfeed/ui/atoms/Text";
import { DetailList } from "@hackerfeed/ui/molecules/DetailList";
import { ProfileSummary } from "@hackerfeed/ui/molecules/ProfileSummary";
import { User } from "lucide-react";
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
