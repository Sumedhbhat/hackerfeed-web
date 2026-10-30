import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Icon } from "../atoms/Icon";

const TONE = {
	default: "text-(--sea-ink)",
	soft: "text-(--sea-ink-soft)",
} as const;

/** A short line of text led by an icon, e.g. "✓ ChatGPT is connected." */
export function IconText({
	icon,
	iconSize = 15,
	tone = "default",
	truncate = false,
	role,
	children,
}: {
	icon: LucideIcon;
	iconSize?: number;
	tone?: keyof typeof TONE;
	/** Cut the text off with an ellipsis instead of wrapping. */
	truncate?: boolean;
	role?: "status" | "alert";
	children: ReactNode;
}) {
	return (
		<p
			role={role}
			className={`m-0 flex min-w-0 items-center gap-2 text-sm ${TONE[tone]}`}
		>
			<Icon icon={icon} size={iconSize} />
			{truncate ? <span className="truncate">{children}</span> : children}
		</p>
	);
}
