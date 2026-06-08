import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { getCurrentSession } from "./session";

export const getRequiredSessionUser = createServerFn({ method: "GET" }).handler(
	async () => {
		const request = getRequest();
		const session = await getCurrentSession(request);

		if (session.setCookie) {
			setResponseHeader("Set-Cookie", session.setCookie);
		}

		return session.sessionUser;
	},
);
