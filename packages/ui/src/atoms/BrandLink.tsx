import { createLink } from "@tanstack/react-router";
import type { AnchorHTMLAttributes } from "react";

type BrandAnchorProps = Omit<
	AnchorHTMLAttributes<HTMLAnchorElement>,
	"className" | "style" | "children"
> & {
	ref?: React.Ref<HTMLAnchorElement>;
};

/** Text lines on the page: [y, width] in the favicon's 512-unit grid. */
const LINES: [number, number][] = [
	[207, 283],
	[237, 232],
	[267, 283],
	[297, 198],
	[327, 283],
	[357, 249],
	[387, 155],
];

/**
 * The HackerFeed favicon (public/favicon.ico) redrawn as SVG: a dog-eared page
 * with an orange headline and lines of text. Its own fixed colours, like the
 * favicon, in both themes.
 */
function BrandMark() {
	return (
		<svg
			viewBox="0 0 512 512"
			width="28"
			height="28"
			aria-hidden="true"
			className="block shrink-0 rounded-md"
		>
			<rect width="512" height="512" fill="#1c1a18" />
			<path d="M64 64H356L446 154V446H64Z" fill="#f5f2ee" />
			<path d="M356 64V154H446Z" fill="#d3cfca" />
			<rect x="114" y="120" width="236" height="42" fill="#c25a28" />
			<rect x="114" y="185" width="283" height="3" fill="#5c5955" />
			{LINES.map(([y, width]) => (
				<rect key={y} x="114" y={y} width={width} height="15" fill="#5c5955" />
			))}
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
			<span className="sr-only font-serif text-xl font-semibold tracking-[-0.01em] text-(--sea-ink) sm:not-sr-only">
				HackerFeed
			</span>
		</a>
	);
}

/** In-app link (usually `to="/"`) rendered as the HackerFeed logo. */
export const BrandLink = createLink(BrandAnchor);
