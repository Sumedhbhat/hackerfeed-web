const HACKER_NEWS_API_ORIGIN = "https://hacker-news.firebaseio.com";

type PolicyEnv = {
	apiUrl: string;
	workosApiHostname?: string;
	sentryDsn?: string;
};

/**
 * The browser may only send requests to this site, the HackerFeed API, and
 * the services the app calls directly: WorkOS sign-in, Sentry, and Hacker News.
 */
export function buildContentSecurityPolicy({
	apiUrl,
	workosApiHostname = "api.workos.com",
	sentryDsn,
}: PolicyEnv): string {
	const origins = [
		"'self'",
		new URL(apiUrl).origin,
		`https://${workosApiHostname}`,
		HACKER_NEWS_API_ORIGIN,
		...(sentryDsn ? [new URL(sentryDsn).origin] : []),
	];
	return `connect-src ${origins.join(" ")}`;
}
