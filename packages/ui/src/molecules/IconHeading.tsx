import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Heading } from "../atoms/Heading";
import { Icon } from "../atoms/Icon";

/** Small section heading with a soft icon in front of it. */
export function IconHeading({
	icon,
	id,
	level = 2,
	children,
}: {
	icon: LucideIcon;
	id?: string;
	level?: 2 | 3;
	children: ReactNode;
}) {
	return (
		<div className="flex items-center gap-2">
			<span className="flex text-(--sea-ink-soft)">
				<Icon icon={icon} size={16} />
			</span>
			<Heading level={level} size="small" id={id}>
				{children}
			</Heading>
		</div>
	);
}
