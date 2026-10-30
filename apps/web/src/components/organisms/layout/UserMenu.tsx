import { LogOut, User } from "lucide-react";
import { Avatar } from "#/components/atoms/Avatar";
import { AvatarSkeleton } from "#/components/atoms/AvatarSkeleton";
import { ButtonLink } from "#/components/atoms/Button";
import { MenuItem, MenuLinkItem } from "#/components/atoms/Menu";
import { Stack } from "#/components/atoms/Stack";
import { Text } from "#/components/atoms/Text";
import { DropdownMenu } from "#/components/molecules/DropdownMenu";
import { useUserMenu } from "#/hooks/useUserMenu";

export default function UserMenu() {
	const { user, isLoading, signOut, initials, displayName } = useUserMenu();

	if (isLoading) {
		return <AvatarSkeleton />;
	}

	if (!user) {
		return (
			<ButtonLink to="/profile" variant="icon" aria-label="Profile">
				<User size={16} aria-hidden="true" />
			</ButtonLink>
		);
	}

	return (
		<DropdownMenu
			triggerLabel="User menu"
			trigger={
				<Avatar
					name={displayName}
					initials={initials}
					imageUrl={user.profilePictureUrl}
				/>
			}
			header={
				<>
					<Avatar
						name={displayName}
						initials={initials}
						imageUrl={user.profilePictureUrl}
						size="md"
					/>
					<Stack gap="none" grow>
						<Text as="div" weight="semibold" truncate>
							{displayName}
						</Text>
						<Text as="div" size="xs" tone="soft" truncate>
							{user.email}
						</Text>
					</Stack>
				</>
			}
		>
			<MenuLinkItem to="/profile">
				<User size={15} aria-hidden="true" />
				Profile
			</MenuLinkItem>
			<MenuItem onClick={() => signOut()}>
				<LogOut size={15} aria-hidden="true" />
				{import.meta.env.VITE_DEMO_DATA === "true" ? "Reset demo" : "Log out"}
			</MenuItem>
		</DropdownMenu>
	);
}
