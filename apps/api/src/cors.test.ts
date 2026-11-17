import { describe, expect, it, vi } from "vitest";
import { onlyFromOrigin } from "./cors";

const FRONTEND = "https://hackerfeed-web.example.workers.dev";

function request(init: RequestInit & { origin?: string } = {}) {
	const headers = new Headers(init.headers);
	if (init.origin) headers.set("Origin", init.origin);
	return new Request("https://api.example/api/feature-flags", {
		...init,
		headers,
	});
}

describe("onlyFromOrigin", () => {
	it("rejects other origins and requests without one before handling them", async () => {
		const handle = vi.fn(async () => new Response("ok"));
		const api = onlyFromOrigin(FRONTEND, handle);

		for (const origin of [undefined, "https://evil.example", "null"]) {
			const response = await api(request({ origin }));
			expect(response.status).toBe(403);
			expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
		}
		expect(handle).not.toHaveBeenCalled();
	});

	it("answers the frontend's preflight without handling it", async () => {
		const handle = vi.fn(async () => new Response("ok"));
		const response = await onlyFromOrigin(
			FRONTEND,
			handle,
		)(request({ method: "OPTIONS", origin: FRONTEND }));

		expect(response.status).toBe(204);
		expect(response.headers.get("Access-Control-Allow-Origin")).toBe(FRONTEND);
		expect(response.headers.get("Access-Control-Allow-Headers")).toContain(
			"authorization",
		);
		expect(response.headers.get("Access-Control-Allow-Headers")).toContain(
			"x-client-trace",
		);
		expect(handle).not.toHaveBeenCalled();
	});

	it("passes the frontend's requests on and lets it read the trace ID", async () => {
		const response = await onlyFromOrigin(FRONTEND, async () =>
			Response.json({ flags: {} }, { headers: { "x-sentry-trace-id": "abc" } }),
		)(request({ origin: FRONTEND }));

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ flags: {} });
		expect(response.headers.get("Access-Control-Allow-Origin")).toBe(FRONTEND);
		expect(response.headers.get("Access-Control-Expose-Headers")).toBe(
			"x-sentry-trace-id",
		);
		expect(response.headers.get("Vary")).toBe("Origin");
	});
});
