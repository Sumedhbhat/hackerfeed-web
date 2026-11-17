import { describe, expect, it } from "vitest";
import { createBackend } from "./index";

const handle = createBackend({ workos: { clientId: "client_test" } });

describe("createBackend", () => {
	it.each([
		["no token", {}],
		["a malformed header", { Authorization: "Basic abc" }],
	])("rejects a request with %s before routing", async (_, headers) => {
		for (const path of ["/api/trpc/account.me", "/api/feature-flags", "/x"]) {
			const response = await handle(
				new Request(`https://api.example${path}`, { headers }),
			);
			expect(response.status).toBe(401);
		}
	});
});
