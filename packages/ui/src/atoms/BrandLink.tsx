import { createLink } from "@tanstack/react-router";
import type { AnchorHTMLAttributes } from "react";

type BrandAnchorProps = Omit<
	AnchorHTMLAttributes<HTMLAnchorElement>,
	"className" | "style" | "children"
> & {
	ref?: React.Ref<HTMLAnchorElement>;
};

function BrandMark() {
	return (
		<svg
			viewBox="0 0 28 28"
			width="28"
			height="28"
			aria-hidden="true"
			className="block shrink-0"
		>
			<rect width="28" height="28" rx="7" fill="var(--lagoon)" />
			<path
				d="M6.5 11h7M6.5 15h7M6.5 19h10"
				stroke="var(--on-lagoon)"
				strokeWidth="2"
				strokeLinecap="round"
				opacity="0.75"
			/>
			<path d="M16 0h6.5v13.5l-3.25-2.75L16 13.5z" fill="var(--on-lagoon)" />
		</svg>
	);
}

function BrandAnchor(props: BrandAnchorProps) {
	return (
		<a
			{...props}
			className="flex flex-shrink-0 items-center gap-2.5 rounded-md no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--lagoon)"
		>
			<BrandMark />
			<span className="sr-only font-serif text-xl font-semibold tracking-[-0.01em] text-(--sea-ink) sm:not-sr-only">
				HackerFeed
			</span>
		</a>
	);
}

/** In-app link (usually `to="/"`) rendered as the HackerFeed logo. */
export const BrandLink = createLink(BrandAnchor);
