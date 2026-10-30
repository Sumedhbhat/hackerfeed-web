import type { HTMLAttributes } from "react";

type PanelSectionProps = Omit<
	HTMLAttributes<HTMLElement>,
	"className" | "style"
> & {
	as?: "section" | "div";
};

/** Part of a Panel or Card, set off from the content above by a hairline. */
export function PanelSection({
	as: Element = "section",
	...props
}: PanelSectionProps) {
	return <Element className="border-t border-(--line) pt-5" {...props} />;
}
