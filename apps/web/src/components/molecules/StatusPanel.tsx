import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Heading } from "#/components/atoms/Heading";
import { IconBadge } from "#/components/atoms/IconBadge";
import { Kicker } from "#/components/atoms/Kicker";
import { Panel } from "#/components/atoms/Panel";
import { Text } from "#/components/atoms/Text";

type StatusPanelProps = {
	icon: LucideIcon;
	iconTone?: "accent" | "soft";
	iconSpinning?: boolean;
	kicker: string;
	title: string;
	description?: ReactNode;
	/** Buttons or links shown under the description. */
	actions?: ReactNode;
	/** Extra content such as a trace ID note. */
	children?: ReactNode;
};

/** Centered panel for one-off states like "signed out" or "something went wrong". */
export function StatusPanel({
	icon,
	iconTone = "accent",
	iconSpinning = false,
	kicker,
	title,
	description,
	actions,
	children,
}: StatusPanelProps) {
	return (
		<Panel width="md">
			<IconBadge icon={icon} tone={iconTone} spinning={iconSpinning} />
			<div className="mt-5">
				<Kicker>{kicker}</Kicker>
			</div>
			<div className="mt-2">
				<Heading level={1} size="page">
					{title}
				</Heading>
			</div>
			{description ? (
				<div className="mt-3">
					<Text tone="soft" relaxed>
						{description}
					</Text>
				</div>
			) : null}
			{children ? <div className="mt-3">{children}</div> : null}
			{actions ? (
				<div className="mt-6 flex flex-wrap items-center gap-3">{actions}</div>
			) : null}
		</Panel>
	);
}
