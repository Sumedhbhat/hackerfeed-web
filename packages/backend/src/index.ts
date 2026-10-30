import "@tanstack/react-start/server-only";

import { type AiRuntimeConfig, createAiRuntime } from "./ai/runtime";
import {
	createRequestAuthenticator,
	type WorkosConfig,
} from "./auth/workos-access-token";
import { evaluateFeatureFlags } from "./feature-flags/service";
import { createTrpcHandler } from "./trpc/handler";

export type BackendConfig = {
	workos: WorkosConfig;
	ai: Omit<AiRuntimeConfig, "getUser">;
};

/** The request handlers the web app's routes delegate to. */
export function createBackend(config: BackendConfig) {
	const getRequestUser = createRequestAuthenticator(config.workos);

	return {
		ai: createAiRuntime({ ...config.ai, getUser: getRequestUser }),
		handleTrpcRequest: createTrpcHandler(getRequestUser),
		async handleFeatureFlagsRequest(request: Request) {
			return Response.json(
				{ flags: evaluateFeatureFlags(await getRequestUser(request)) },
				{ headers: { "Cache-Control": "no-store" } },
			);
		},
	};
}

export type Backend = ReturnType<typeof createBackend>;
