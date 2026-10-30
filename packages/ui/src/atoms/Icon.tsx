import type { LucideIcon } from "lucide-react";

type IconProps = {
	icon: LucideIcon;
	size?: number;
	/** Fill the shape with the text color (e.g. a saved star). */
	filled?: boolean;
	/** Play the little "pop" animation, e.g. when something is saved. */
	pop?: boolean;
	/** Dim the icon next to text. */
	muted?: boolean;
};

/** Decorative icon that sits inline with text. */
export function Icon({
	icon: Glyph,
	size = 14,
	filled = false,
	pop = false,
	muted = false,
}: IconProps) {
	const className = [
		"inline shrink-0",
		pop && "star-pop",
		muted && "opacity-60",
	]
		.filter(Boolean)
		.join(" ");
	return (
		<Glyph
			size={size}
			aria-hidden="true"
			fill={filled ? "currentColor" : undefined}
			className={className}
		/>
	);
}
