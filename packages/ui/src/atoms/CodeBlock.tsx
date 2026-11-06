/** Preformatted code shown exactly as written, scrolling sideways when long. */
export function CodeBlock({ code }: { code: string }) {
	return (
		<pre className="m-0 overflow-x-auto rounded-lg bg-(--chip-bg) px-3.5 py-3 text-meta text-(--sea-ink)">
			<code>{code}</code>
		</pre>
	);
}
