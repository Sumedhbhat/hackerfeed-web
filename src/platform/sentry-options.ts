type SentryEnv = Record<string, string | undefined>;

function sampleRate(value: string | undefined, fallback: number) {
	if (!value) return fallback;

	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

/** Server Sentry options shared by every deploy target. */
export function getSentryServerOptions(env: SentryEnv) {
	if (!env.SENTRY_DSN) return undefined;

	return {
		dsn: env.SENTRY_DSN,
		environment: env.SENTRY_ENVIRONMENT ?? "production",
		release: env.SENTRY_RELEASE,
		tracesSampleRate: sampleRate(env.SENTRY_TRACES_SAMPLE_RATE, 0.1),
		// Logs come from `#/lib/logger`, which also writes the console line.
		enableLogs: true,
		sendDefaultPii: false,
	};
}
