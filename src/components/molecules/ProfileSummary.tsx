import { Mail } from "lucide-react";
import { Avatar } from "#/components/atoms/Avatar";
import { Heading } from "#/components/atoms/Heading";
import { Kicker } from "#/components/atoms/Kicker";
import { IconText } from "#/components/molecules/IconText";

/** Picture, name and email at the top of the profile page. */
export function ProfileSummary({
	name,
	email,
	imageUrl,
	initials,
}: {
	name: string;
	email: string;
	imageUrl?: string | null;
	initials: string;
}) {
	return (
		<div className="flex flex-col gap-5 sm:flex-row sm:items-center">
			<Avatar
				name={name}
				imageUrl={imageUrl}
				initials={initials}
				size="lg"
				labelled
			/>
			<div className="min-w-0">
				<Kicker>Profile</Kicker>
				<div className="mt-1">
					<Heading level={1} size="page" truncate>
						{name}
					</Heading>
				</div>
				<div className="mt-2">
					<IconText icon={Mail} tone="soft" truncate>
						{email}
					</IconText>
				</div>
			</div>
		</div>
	);
}
