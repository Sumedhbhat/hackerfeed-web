/**
 * openLink — centralised external-link opening abstraction.
 *
 * Today this is a thin wrapper around `window.open` with sensible defaults
 * for web (new tab, no opener/referrer).  The signature and behaviour are
 * intentionally kept minimal so the implementation can later be swapped for
 * a Capacitor / Cordova in-app-browser call during the PWA or hybrid-app
 * phase without touching every call-site.
 *
 * Usage:
 *   openLink(story.url)                   // open an article URL
 *   openLink(getDiscussionUrl(story.id))   // open an HN discussion thread
 */
export function openLink(url: string): void {
	window.open(url, "_blank", "noopener,noreferrer");
}
