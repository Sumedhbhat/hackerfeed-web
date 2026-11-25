import { createTRPCClient, httpLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "../../api-types";
import type { DatabaseContext } from "../../database/client";
import { createBackend } from "../../index";
import type { createFakeWorkos } from "./external-services";

const API_ORIGIN = "https://api.hackerfeed.test";

/**
 * The backend as the browser reaches it through apps/api: real auth, routing
 * and tRPC over HTTP. apps/api's origin check is tested in apps/api.
 */
export function createTestApi(
	workos: ReturnType<typeof createFakeWorkos>,
	database: DatabaseContext,
) {
	const handle = createBackend({
		workos: { apiHostname: workos.apiHostname, clientId: workos.clientId },
		database,
	});

	function request(
		path: string,
		{ token, ...init }: RequestInit & { token?: string } = {},
	) {
		const headers = new Headers(init.headers);
		if (token) headers.set("Authorization", `Bearer ${token}`);
		return handle(new Request(`${API_ORIGIN}${path}`, { ...init, headers }));
	}

	return {
		request,
		/** A tRPC client signed in as this WorkOS user. */
		as(workosUserId: string) {
			const token = workos.accessToken(workosUserId);
			return createTRPCClient<AppRouter>({
				links: [
					httpLink({
						url: `${API_ORIGIN}/api/trpc`,
						transformer: superjson,
						headers: async () => ({ Authorization: `Bearer ${await token}` }),
						fetch: (url, init) => handle(new Request(url, init)),
					}),
				],
			});
		},
	};
}

export type TestApi = ReturnType<typeof createTestApi>;
