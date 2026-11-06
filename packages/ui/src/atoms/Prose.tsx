/** Renders trusted HTML (story text, comments) with readable typography. */
export function Prose({ html }: { html: string }) {
	return (
		<div
			className="prose max-w-[68ch] text-read text-(--sea-ink) prose-p:my-2 prose-a:break-words prose-a:text-(--lagoon-deep) prose-a:underline prose-a:decoration-(--lagoon)/40 prose-a:underline-offset-[3px] prose-pre:rounded-lg prose-pre:bg-(--chip-bg) prose-pre:text-(--sea-ink) prose-code:text-(--sea-ink) prose-code:before:content-none prose-code:after:content-none prose-strong:text-(--sea-ink)"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: HN API returns trusted HTML
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
}
