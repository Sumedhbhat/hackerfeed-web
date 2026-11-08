export function pageTitle(name?: string | null): string {
	return name ? `${name} · HackerFeed` : "HackerFeed";
}

export function titleHead(name?: string | null) {
	return { meta: [{ title: pageTitle(name) }] };
}
