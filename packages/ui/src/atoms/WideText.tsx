import type { ReactNode } from "react";

const FROM = {
	/** Hidden below 360px (320px zoomed or tiny phones). */
	min: "max-[359px]:hidden",
	/** Hidden below 380px (the narrowest phones). */
	xs: "max-xs:hidden",
	/** Hidden on phones. */
	sm: "max-sm:hidden",
} as const;

/**
 * Words inside a link or button that small screens leave out to save room
 * ("4 comments" becomes "4", "Read article" becomes "Read"). Give the control
 * an aria-label that says the full thing; this text is hidden from screen
 * readers to avoid repeating it.
 */
export function WideText({
	children,
	from = "sm",
}: {
	children: ReactNode;
	from?: keyof typeof FROM;
}) {
	return (
		<span aria-hidden="true" className={FROM[from]}>
			{children}
		</span>
	);
}
