import type { HTMLAttributes } from "react";

const SPACING = {
	/** Standard page: room above for the header, generous space below. */
	default: "px-4 pt-6 pb-16 sm:pt-10",
	/** Tighter list pages such as favorites. */
	compact: "px-4 pt-6 pb-14",
	/** Short status pages (signed out, auth callback). */
	status: "min-h-[calc(100vh-9rem)] px-4 py-8",
} as const;

type PageContainerProps = Omit<
	HTMLAttributes<HTMLElement>,
	"className" | "style"
> & {
	as?: "main" | "div";
	spacing?: keyof typeof SPACING;
};

/** Centered, width-limited column that every page sits in. */
export function PageContainer({
	as: Element = "main",
	spacing = "default",
	...props
}: PageContainerProps) {
	return <Element className={`page-wrap ${SPACING[spacing]}`} {...props} />;
}
