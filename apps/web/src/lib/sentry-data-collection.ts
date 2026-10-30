import type { DataCollection } from "@sentry/core";

const NETWORK_IDENTITY_KEYS = ["forwarded", "-ip", "remote-", "via", "-user"];

/**
 * Sentry v11 collects user info, cookies, bodies and query data unless told
 * otherwise. This keeps the v10 `sendDefaultPii: false` behavior.
 */
export const sentryDataCollection: DataCollection = {
	userInfo: false,
	cookies: false,
	httpHeaders: {
		request: { deny: NETWORK_IDENTITY_KEYS },
		response: { deny: NETWORK_IDENTITY_KEYS },
	},
	httpBodies: [],
	urlQueryParams: { deny: NETWORK_IDENTITY_KEYS },
	genAI: { inputs: false, outputs: false },
	databaseQueryData: false,
	queues: false,
	graphQL: { document: false, variables: false },
};
