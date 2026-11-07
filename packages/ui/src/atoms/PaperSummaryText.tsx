import type { ReactNode, Ref } from "react";

/** The summary or abstract paragraph of a paper; `clamped` cuts it to 3 lines. */
export function PaperSummaryText({
	children,
	clamped = false,
	ref,
}: {
	children: ReactNode;
	clamped?: boolean;
	ref?: Ref<HTMLParagraphElement>;
}) {
	return (
		<p
			ref={ref}
			className={`m-0 max-w-[68ch] text-read text-(--sea-ink-soft) ${clamped ? "line-clamp-3" : ""}`}
		>
			{children}
		</p>
	);
}
