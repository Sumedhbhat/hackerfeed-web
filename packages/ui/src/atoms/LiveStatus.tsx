/**
 * A visually hidden polite status for screen readers (WCAG 4.1.3): render it
 * once and change its text to announce something ("6 papers", "ChatGPT
 * replied"). Keep it mounted; an empty message announces nothing.
 */
export function LiveStatus({ message }: { message: string }) {
	return (
		<output aria-live="polite" className="sr-only">
			{message}
		</output>
	);
}
