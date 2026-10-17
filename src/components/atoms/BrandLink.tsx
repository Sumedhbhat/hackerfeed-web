import { createLink } from "@tanstack/react-router";
import type { AnchorHTMLAttributes } from "react";

type BrandAnchorProps = Omit<
	AnchorHTMLAttributes<HTMLAnchorElement>,
	"className" | "style" | "children"
> & {
	ref?: React.Ref<HTMLAnchorElement>;
};

/** HackerFeed logo: the app icon on phones, the wordmark from `sm` up. */
function BrandAnchor(props: BrandAnchorProps) {
	return (
		<a
			className="group flex flex-shrink-0 items-center gap-2.5 no-underline"
			{...props}
		>
			<img
				src="/logo192.png"
				alt="HackerFeed"
				className="block h-7 w-7 rounded-md sm:hidden"
			/>
			<span
				className="hidden h-5 w-[1.5px] bg-(--lagoon) opacity-80 transition-opacity group-hover:opacity-100 sm:block"
				aria-hidden="true"
			/>
			<span className="hidden text-base font-semibold tracking-tight text-(--sea-ink) sm:block">
				HackerFeed
			</span>
		</a>
	);
}

/** In-app link (usually `to="/"`) rendered as the HackerFeed logo. */
export const BrandLink = createLink(BrandAnchor);
