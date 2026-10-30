import "@tanstack/react-start/server-only";

import type { AuthenticatedWorkosUser } from "../auth/current-user";
import type { RequestAuthenticator } from "../auth/workos-access-token";
import type { DatabaseContext } from "../database/client";

export type TrpcContext = {
	database: DatabaseContext;
	user: AuthenticatedWorkosUser | null;
};

export function createTrpcContext({
	database,
	user = null,
}: {
	database: DatabaseContext;
	user?: AuthenticatedWorkosUser | null;
}): TrpcContext {
	return { database, user };
}

export async function createTrpcContextFromRequest(
	request: Request,
	database: DatabaseContext,
	getRequestUser: RequestAuthenticator,
): Promise<TrpcContext> {
	return createTrpcContext({ database, user: await getRequestUser(request) });
}
