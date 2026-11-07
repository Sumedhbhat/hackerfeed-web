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
	// Name and email move under the avatar when they don't fit beside it,
	// rather than squeezing (WCAG 1.4.4).
	return (
		<div className="flex flex-wrap items-center gap-4 sm:gap-5">
			<Avatar
				name={name}
				imageUrl={imageUrl}
				initials={initials}
				size="profile"
				labelled
			/>
			<div className="min-w-0">
				<div>
					<Heading level={1} size="page">
						{name}
					</Heading>
				</div>
				<div className="mt-2">
					<IconText icon={Mail} tone="soft" breakAnywhere>
						{email}
					</IconText>
				</div>
			</div>
		</div>
	);
}
