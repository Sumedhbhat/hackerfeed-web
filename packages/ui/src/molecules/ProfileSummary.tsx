import { Mail } from "lucide-react";
import { Avatar } from "../atoms/Avatar";
import { Heading } from "../atoms/Heading";
import { IconText } from "./IconText";

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
		<div className="flex items-center gap-4 sm:gap-5">
			<Avatar
				name={name}
				imageUrl={imageUrl}
				initials={initials}
				size="profile"
				labelled
			/>
			<div className="min-w-0">
				<div>
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
