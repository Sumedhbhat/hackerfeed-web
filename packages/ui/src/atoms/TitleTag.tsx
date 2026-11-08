import type { ReactNode } from "react";

const SIZE = {
	row: "align-[0.1em] text-meta",
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
