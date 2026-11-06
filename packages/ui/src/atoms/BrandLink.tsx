import { createLink } from "@tanstack/react-router";
import type { AnchorHTMLAttributes } from "react";

type BrandAnchorProps = Omit<
	AnchorHTMLAttributes<HTMLAnchorElement>,
	"className" | "style" | "children"
> & {
	ref?: React.Ref<HTMLAnchorElement>;
};

/** A green page with a brass bookmark hanging from it: the app's whole idea in one mark. */
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
				d="M8 9.5h9M8 14h12M8 18.5h7"
				stroke="var(--on-lagoon)"
				strokeWidth="2"
				strokeLinecap="round"
			/>
			<path d="M19 0h5v9l-2.5-2-2.5 2z" fill="var(--bookmark-ribbon)" />
		</svg>
	);
}

/** HackerFeed logo: the mark on phones, mark and wordmark from `sm` up. */
function BrandAnchor(props: BrandAnchorProps) {
	return (
		<a
			{...props}
			className="flex flex-shrink-0 items-center gap-2.5 rounded-md no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--lagoon)"
		>
			<BrandMark />
			<span className="sr-only font-serif text-row font-semibold tracking-[-0.01em] text-(--sea-ink) sm:not-sr-only">
				HackerFeed
			</span>
		</a>
	);
}

/** In-app link (usually `to="/"`) rendered as the HackerFeed logo. */
export const BrandLink = createLink(BrandAnchor);
