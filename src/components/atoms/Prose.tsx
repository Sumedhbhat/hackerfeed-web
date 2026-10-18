/** Renders trusted HTML (story text, comments) with readable typography. */
export function Prose({ html }: { html: string }) {
	return (
		<div
			className="prose prose-sm max-w-none text-(--sea-ink-soft) prose-a:text-(--lagoon-deep) prose-a:no-underline hover:prose-a:underline prose-pre:bg-(--sand) prose-code:text-(--sea-ink) prose-p:my-1.5"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: HN API returns trusted HTML
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
}
