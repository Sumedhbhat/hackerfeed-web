import { describe, expect, it } from "vitest";
import { createCodeChallenge, randomValue, toBase64Url } from "./pkce";

describe("pkce helpers", () => {
	it("matches the RFC 7636 S256 example", async () => {
		await expect(
			createCodeChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
		).resolves.toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
	});

	it("generates distinct 256-bit base64url values", () => {
		const first = randomValue();

		expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
		expect(randomValue()).not.toBe(first);
	});

	it("encodes base64url without padding", () => {
		expect(toBase64Url(new Uint8Array([251, 255, 191]))).toBe("-_-_");
		expect(toBase64Url(new Uint8Array([1]))).toBe("AQ");
	});
});
