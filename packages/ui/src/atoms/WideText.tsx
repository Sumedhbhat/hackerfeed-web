import type { ReactNode } from "react";

const FROM = {
	xs: "max-xs:hidden",
	sm: "max-sm:hidden",
} as const;

/** Hidden from screen readers, so give the control an aria-label that says the full thing. */
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
