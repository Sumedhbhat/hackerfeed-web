import type { LucideIcon } from "lucide-react";

type IconProps = {
	icon: LucideIcon;
	size?: number;
	filled?: boolean;
	/** Dim the icon next to text. */
	muted?: boolean;
	accent?: boolean;
};

/** Decorative icon that sits inline with text. */
export function Icon({
	icon: Glyph,
	size = 16,
	filled = false,
	muted = false,
	accent = false,
}: IconProps) {
	return (
		<Glyph
			size={size}
			aria-hidden="true"
			strokeWidth={1.75}
			fill={filled ? "currentColor" : "none"}
			className={`inline shrink-0 ${muted ? "opacity-70" : ""} ${accent ? "text-accent" : ""}`}
		/>
	);
}
