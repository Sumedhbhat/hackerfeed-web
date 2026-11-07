import type { ReactNode } from "react";

/** A small label before a title saying what kind of post it is, e.g. "Show HN". Screen readers hear "Show HN: …". */
const SIZE = {
	/** Beside a list-row title. */
	row: "align-[0.1em] text-meta",
	/** Beside a page headline. */
	headline: "align-[0.25em] text-base",
} as const;

export function TitleTag({
	children,
	size = "row",
}: {
	children: ReactNode;
	size?: keyof typeof SIZE;
}) {
	return (
		<>
			<span
				className={`font-sans font-semibold whitespace-nowrap text-(--lagoon-deep) ${SIZE[size]}`}
			>
				{children}
				<span className="sr-only">:</span>
			</span>{" "}
		</>
	);
}
