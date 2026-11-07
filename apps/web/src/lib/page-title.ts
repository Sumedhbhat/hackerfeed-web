/** "Papers · HackerFeed": each page gets its own title (WCAG 2.4.2). */
export function pageTitle(name?: string | null): string {
	return name ? `${name} · HackerFeed` : "HackerFeed";
}

/** A route `head()` that sets just the title. */
export function titleHead(name?: string | null) {
	return { meta: [{ title: pageTitle(name) }] };
}
