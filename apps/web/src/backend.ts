import "@tanstack/react-start/server-only";

import { createBackend } from "@hackerfeed/backend";
import { env } from "./env";

export const backend = createBackend({
	workos: {
		apiHostname: env.VITE_WORKOS_API_HOSTNAME,
		clientId: env.VITE_WORKOS_CLIENT_ID,
	},
});
