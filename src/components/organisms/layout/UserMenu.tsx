import { LogOut, User } from "lucide-react";
import { Avatar } from "#/components/atoms/Avatar";
import { AvatarSkeleton } from "#/components/atoms/AvatarSkeleton";
import { Button, ButtonLink } from "#/components/atoms/Button";
import { Stack } from "#/components/atoms/Stack";
import { Text } from "#/components/atoms/Text";
import { DropdownMenu } from "#/components/molecules/DropdownMenu";
import { useUserMenu } from "#/hooks/useUserMenu";

export default function UserMenu() {
	const {
		open,
		setOpen,
		containerRef,
		user,
		isLoading,
		signOut,
		initials,
		displayName,
	} = useUserMenu();

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
			containerRef={containerRef}
			open={open}
			trigger={
				<Button
					variant="icon"
					onClick={() => setOpen((v) => !v)}
					aria-label="User menu"
					aria-expanded={open}
				>
					<Avatar
						name={displayName}
						initials={initials}
						imageUrl={user.profilePictureUrl}
						labelled
					/>
				</Button>
			}
			header={
				<>
					<Avatar
						name={displayName}
						initials={initials}
						imageUrl={user.profilePictureUrl}
						size="md"
						labelled
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
			<ButtonLink to="/profile" variant="ghost" onClick={() => setOpen(false)}>
				<User size={15} aria-hidden="true" />
				Profile
			</ButtonLink>
			<Button variant="ghost" onClick={() => signOut()}>
				<LogOut size={15} aria-hidden="true" />
				Log out
			</Button>
		</DropdownMenu>
	);
}
