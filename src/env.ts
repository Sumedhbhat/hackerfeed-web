import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const runtimeEnv =
	typeof process === "undefined"
		? import.meta.env
		: { ...import.meta.env, ...process.env };

export const env = createEnv({
	server: {
		SERVER_URL: z.url().optional(),
		// Encrypts stored AI provider tokens and the provider sign-in flow cookie.
		AI_TOKEN_ENCRYPTION_KEY: z.string().min(32),
		// Sign in with ChatGPT. Without a client id issued by OpenAI, sign-in
		// only works on http://127.0.0.1 via dynamic registration.
		CHATGPT_CLIENT_ID: z.string().min(1).optional(),
		CHATGPT_CLIENT_SECRET: z.string().min(1).optional(),
	},

	clientPrefix: "VITE_",

	client: {
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
