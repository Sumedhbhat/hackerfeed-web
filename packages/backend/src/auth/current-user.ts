import "@tanstack/react-start/server-only";

export class UnauthorizedError extends Error {
	constructor() {
		super("Authentication required");
		this.name = "UnauthorizedError";
	}
}

export type AuthenticatedWorkosUser = {
	workosUserId: string;
};

type WorkosUserIdentitySource = {
	id?: string | null;
	workosUserId?: string | null;
};

export function resolveCurrentWorkosUser(
	user: WorkosUserIdentitySource | null | undefined,
): AuthenticatedWorkosUser {
	const workosUserId = user?.workosUserId ?? user?.id;

	if (!workosUserId) {
		throw new UnauthorizedError();
	}

	return { workosUserId };
}
