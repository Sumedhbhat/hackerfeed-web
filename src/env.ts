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

	/**
	 * The prefix that client-side variables must have. This is enforced both at
	 * a type-level and at runtime.
	 */
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

	/**
	 * What object holds the environment variables at runtime. This is usually
	 * `process.env` or `import.meta.env`.
	 */
	runtimeEnv,

	/**
	 * By default, this library will feed the environment variables directly to
	 * the Zod validator.
	 *
	 * This means that if you have an empty string for a value that is supposed
	 * to be a number (e.g. `PORT=` in a ".env" file), Zod will incorrectly flag
	 * it as a type mismatch violation. Additionally, if you have an empty string
	 * for a value that is supposed to be a string with a default value (e.g.
	 * `DOMAIN=` in an ".env" file), the default value will never be applied.
	 *
	 * In order to solve these issues, we recommend that all new projects
	 * explicitly specify this option as true.
	 */
	emptyStringAsUndefined: true,
});
