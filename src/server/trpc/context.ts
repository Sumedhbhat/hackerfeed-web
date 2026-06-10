import "@tanstack/react-start/server-only";

import type { AuthenticatedWorkosUser } from "#/server/auth/current-user";
import type { CurrentSession } from "#/server/auth/session";
import {
	getBearerToken,
	verifyWorkosAccessToken,
} from "#/server/auth/workos-access-token";

export type TrpcContext = {
	user: AuthenticatedWorkosUser | null;
};

type GetCurrentSession = (request: Request) => Promise<CurrentSession>;

async function getCurrentSessionFromRequest(
	request: Request,
): Promise<CurrentSession> {
	const { getCurrentSession } = await import("#/server/auth/session");
	return getCurrentSession(request);
}

export function createTrpcContext({
	user = null,
}: {
	user?: AuthenticatedWorkosUser | null;
} = {}): TrpcContext {
	return { user };
}

export async function createTrpcContextFromRequest(
	request: Request,
	{
		getSession = getCurrentSessionFromRequest,
		verifyAccessToken = verifyWorkosAccessToken,
	}: {
		getSession?: GetCurrentSession;
		verifyAccessToken?: (
			token: string,
		) => Promise<AuthenticatedWorkosUser | null>;
	} = {},
): Promise<TrpcContext> {
	const token = getBearerToken(request);

	if (!token) {
		const session = await getSession(request);
		return createTrpcContext({ user: session.user });
	}

	return createTrpcContext({
		user: await verifyAccessToken(token),
	});
}
