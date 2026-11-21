import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Icon } from "../atoms/Icon";

/** One headline number with its label, e.g. "Current streak · 12 days". */
export function StatTile({
	icon,
	label,
	value,
	detail,
	highlight = false,
}: {
	icon: LucideIcon;
	label: string;
	value: ReactNode;
	detail?: ReactNode;
	/** Draw the icon in the accent colour, e.g. a streak that is alive today. */
	highlight?: boolean;
}) {
	return (
		<div className="flex min-w-[9rem] flex-1 flex-col gap-1 rounded-lg border border-line bg-muted p-4">
			<span className="flex items-center gap-2 text-meta text-ink-soft">
				<Icon icon={icon} size={15} accent={highlight} />
				{label}
			</span>
			<span className="text-page-sm font-semibold text-ink tabular-nums">
				{value}
			</span>
			{detail ? (
				<span className="text-meta text-ink-soft">{detail}</span>
			) : null}
		</div>
	);
}
