import { describe, expect, it } from "vitest";
import {
	clearCookie,
	decodeJsonCookie,
	encodeJsonCookie,
	getRequestCookie,
	normalizeReturnTo,
	serializeCookie,
} from "./cookies";

describe("cookie helpers", () => {
	it("reads a named cookie, preserving '=' in values", () => {
		const request = new Request("https://example.com", {
			headers: { Cookie: "a=1; flow=v1.abc==.def; b=2" },
		});

		expect(getRequestCookie(request, "flow")).toBe("v1.abc==.def");
		expect(getRequestCookie(request, "missing")).toBeNull();
	});

	it("adds Secure only on https", () => {
		const https = serializeCookie("n", "v", {
			maxAge: 10,
			request: new Request("https://example.com"),
		});
		const http = serializeCookie("n", "v", {
			maxAge: 10,
			request: new Request("http://127.0.0.1:3000"),
		});

		expect(https).toBe(
			"n=v; Path=/; HttpOnly; SameSite=Lax; Max-Age=10; Secure",
		);
		expect(http).toBe("n=v; Path=/; HttpOnly; SameSite=Lax; Max-Age=10");
	});

	it("clears cookies with Max-Age=0", () => {
		expect(clearCookie("n", new Request("http://x.test"))).toContain(
			"Max-Age=0",
		);
	});

	it("round-trips JSON cookie values and ignores garbage", () => {
		expect(decodeJsonCookie(encodeJsonCookie({ a: "b c" }))).toEqual({
			a: "b c",
		});
		expect(decodeJsonCookie("%E0%A4%A")).toBeNull();
		expect(decodeJsonCookie(null)).toBeNull();
	});

	it.each([
		["/profile", "/profile"],
		["/chat/1?x=y", "/chat/1?x=y"],
		["//evil.example.com", "/"],
		["https://evil.example.com", "/"],
		[null, "/"],
	])("normalizeReturnTo(%j) = %j", (input, expected) => {
		expect(normalizeReturnTo(input)).toBe(expected);
	});
});
