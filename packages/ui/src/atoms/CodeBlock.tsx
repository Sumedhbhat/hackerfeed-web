export function CodeBlock({ code }: { code: string }) {
	return (
		<section
			aria-label="Code"
			// biome-ignore lint/a11y/noNoninteractiveTabindex: a scrolling region must be focusable to scroll it by keyboard in every browser, not only Chrome
			tabIndex={0}
			className="overflow-x-auto rounded-lg bg-muted"
		>
			<pre className="m-0 w-max min-w-full px-3.5 py-3 text-meta text-ink">
				<code>{code}</code>
			</pre>
		</section>
	);
}
