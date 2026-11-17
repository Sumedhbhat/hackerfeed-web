import {
	CLIENT_TRACE_HEADER,
	SERVER_TRACE_ID_HEADER,
} from "@hackerfeed/runtime/trace-headers";

const PREFLIGHT_MAX_AGE_SECONDS = 86_400;

type Handler = (request: Request) => Promise<Response>;

function withCorsHeaders(response: Response, origin: string): Response {
	const cors = new Response(response.body, response);
	cors.headers.set("Access-Control-Allow-Origin", origin);
	cors.headers.set("Access-Control-Expose-Headers", SERVER_TRACE_ID_HEADER);
	cors.headers.append("Vary", "Origin");
	return cors;
}

/**
 * Serves only requests sent from the HackerFeed frontend: any other `Origin`,
 * or none, gets 403 before `handle` runs.
 */
export function onlyFromOrigin(
	allowedOrigin: string,
	handle: Handler,
): Handler {
	return async (request) => {
		if (request.headers.get("Origin") !== allowedOrigin) {
			return Response.json({ error: "Forbidden" }, { status: 403 });
		}
		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 204,
				headers: {
					"Access-Control-Allow-Origin": allowedOrigin,
					"Access-Control-Allow-Methods": "GET, POST",
					"Access-Control-Allow-Headers": `authorization, content-type, ${CLIENT_TRACE_HEADER}`,
					"Access-Control-Max-Age": String(PREFLIGHT_MAX_AGE_SECONDS),
					Vary: "Origin",
				},
			});
		}
		return withCorsHeaders(await handle(request), allowedOrigin);
	};
}
