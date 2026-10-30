import type { ReactNode } from "react";

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
		<>
			<p>{message}</p>
			{children}
		</>
	);
	if (standalone) {
		return (
			<main className="papers-page">
				<section className="papers-shell papers-state">{content}</section>
			</main>
		);
	}
	return <section className="papers-state">{content}</section>;
}
