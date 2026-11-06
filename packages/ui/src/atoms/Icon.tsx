import type { LucideIcon } from "lucide-react";

type IconProps = {
	icon: LucideIcon;
	size?: number;
	/** Fill the shape with the text color (e.g. a saved bookmark). */
	filled?: boolean;
	/** Dim the icon next to text. */
	muted?: boolean;
};

/** Decorative icon that sits inline with text. */
export function Icon({
	icon: Glyph,
	size = 16,
	filled = false,
	muted = false,
}: IconProps) {
	return (
		<Glyph
			size={size}
			aria-hidden="true"
			strokeWidth={1.75}
			fill={filled ? "currentColor" : "none"}
			className={muted ? "inline shrink-0 opacity-70" : "inline shrink-0"}
		/>
	);
}
