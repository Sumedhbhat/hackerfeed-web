import "@tanstack/react-start/server-only";

import type { AuthenticatedWorkosUser } from "#/server/auth/current-user";
import {
	getBearerToken,
	verifyWorkosAccessToken,
} from "#/server/auth/workos-access-token";

export type TrpcContext = {
	user: AuthenticatedWorkosUser | null;
};

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
		verifyAccessToken = verifyWorkosAccessToken,
	}: {
		verifyAccessToken?: (
			token: string,
		) => Promise<AuthenticatedWorkosUser | null>;
	} = {},
): Promise<TrpcContext> {
	const token = getBearerToken(request);

	if (!token) {
		return createTrpcContext();
	}

	return createTrpcContext({
		user: await verifyAccessToken(token),
	});
}
