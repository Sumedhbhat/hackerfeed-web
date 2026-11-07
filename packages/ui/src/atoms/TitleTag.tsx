import type { ReactNode } from "react";

/** A small label before a title saying what kind of post it is, e.g. "Show HN". Screen readers hear "Show HN: …". */
export function TitleTag({ children }: { children: ReactNode }) {
	return (
		<>
			<span className="align-[0.1em] font-sans text-meta font-semibold whitespace-nowrap text-(--lagoon-deep)">
				{children}
				<span className="sr-only">:</span>
			</span>{" "}
		</>
	);
}
