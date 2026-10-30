import "@tanstack/react-start/server-only";

import type { AuthenticatedWorkosUser } from "#/server/auth/current-user";
import { getRequestUser } from "#/server/auth/workos-access-token";
import type { DatabaseContext } from "#/server/database/client";

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
): Promise<TrpcContext> {
	return createTrpcContext({ database, user: await getRequestUser(request) });
}
