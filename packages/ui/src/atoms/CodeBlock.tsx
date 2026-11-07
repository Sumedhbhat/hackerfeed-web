/**
 * Preformatted code shown exactly as written, scrolling sideways when long.
 * The scrolling box is a named, focusable region so the keyboard can scroll it
 * in every browser, not only Chrome (WCAG 2.1.1).
 */
export function CodeBlock({ code }: { code: string }) {
	return (
		<section
			aria-label="Code"
			// biome-ignore lint/a11y/noNoninteractiveTabindex: a scrolling region must be focusable to scroll it by keyboard
			tabIndex={0}
			className="overflow-x-auto rounded-lg bg-(--chip-bg)"
		>
			<pre className="m-0 w-max min-w-full px-3.5 py-3 text-meta text-(--sea-ink)">
				<code>{code}</code>
			</pre>
		</section>
	);
}
