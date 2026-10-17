import type { LucideIcon } from "lucide-react";

const TONE = {
	accent: "text-(--lagoon)",
	soft: "text-(--sea-ink-soft)",
} as const;

/** Icon inside a round chip, used at the top of status panels. */
export function IconBadge({
	icon: Glyph,
	tone = "accent",
	size = 21,
	spinning = false,
}: {
	icon: LucideIcon;
	tone?: keyof typeof TONE;
	size?: number;
	spinning?: boolean;
}) {
	return (
		<div
			className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-(--chip-line) bg-(--chip-bg) ${TONE[tone]}`}
		>
			<Glyph
				size={size}
				aria-hidden="true"
				className={spinning ? "animate-spin" : undefined}
			/>
		</div>
	);
}
