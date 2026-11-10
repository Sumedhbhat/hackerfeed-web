import type { ReactNode } from "react";
import { PageContainer } from "../atoms/PageContainer";

/** Centered message with actions, for empty and error states of the papers feed. */
export function PaperFeedMessage({
	message,
	children,
	standalone = false,
}: {
	message: ReactNode;
	/** Buttons that get the user unstuck. */
	children?: ReactNode;
	/** Render as the whole papers screen instead of inside PaperPageShell. */
	standalone?: boolean;
}) {
	const content = (
		<section className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-muted-line px-6 py-12 text-center">
			<p className="m-0 max-w-md text-read text-ink-soft">{message}</p>
			{children}
		</section>
	);
	return standalone ? <PageContainer>{content}</PageContainer> : content;
}
