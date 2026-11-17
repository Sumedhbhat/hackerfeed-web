import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const runtimeEnv =
	typeof process === "undefined"
		? import.meta.env
		: { ...import.meta.env, ...process.env };

export const env = createEnv({
	// Static demos never initialize WorkOS or server services.
	skipValidation: import.meta.env.VITE_DEMO_DATA === "true",
	server: {},

	clientPrefix: "VITE_",

	client: {
		VITE_API_URL: z.url(),
		VITE_APP_TITLE: z.string().min(1).optional(),
		VITE_SENTRY_DSN: z.url().optional(),
		VITE_SENTRY_ENVIRONMENT: z.string().min(1).optional(),
		VITE_SENTRY_TRACES_SAMPLE_RATE: z.coerce
			.number()
			.min(0)
			.max(1)
			.default(0.1),
		VITE_WORKOS_CLIENT_ID: z.string().min(1),
		VITE_WORKOS_API_HOSTNAME: z.string().optional(),
		VITE_WORKOS_REDIRECT_URI: z.url(),
	},

	runtimeEnv,

	emptyStringAsUndefined: true,
});
