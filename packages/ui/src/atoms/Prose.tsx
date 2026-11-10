/** Code wraps instead of scrolling sideways, so it never needs a keyboard-scrollable region. */
export function Prose({ html }: { html: string }) {
	return (
		<div
			className="prose max-w-[68ch] text-read text-ink prose-p:my-2 prose-a:break-words prose-a:text-accent-strong prose-a:underline prose-a:decoration-accent/40 prose-a:underline-offset-[3px] prose-pre:rounded-lg prose-pre:bg-muted prose-pre:whitespace-pre-wrap prose-pre:wrap-break-word prose-pre:text-ink prose-code:text-ink prose-code:before:content-none prose-code:after:content-none prose-strong:text-ink"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: HN API returns trusted HTML
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
}
